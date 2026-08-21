import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'
import { subjectIdFromBackend } from '@/lib/subjects'

/**
 * Test papers — the PDF question papers students download, solve on paper, and upload an
 * answer sheet against. Shape is ca/src/data/tests.js, verbatim.
 *
 * @typedef {import('@/types').TestPaper} TestPaper
 * @typedef {import('@/types').UploadTestPaperInput} UploadTestPaperInput
 */

/**
 * The route takes NO query params (app_admin/routes.py → get_uploaded_papers lists every
 * Test with a PDF), so the subject/series filters are applied here. Same query key, same
 * screen — the filtering just doesn't pretend to be server-side.
 *
 * @param {{ subjectId?: string, seriesId?: string }} [filters]
 * @returns {Promise<TestPaper[]>}
 */
export const getPapers = async (filters = {}) => {
  const { data } = await api.get('/api/admin/papers')
  return asArray(data)
    .map((row) => toPaper(row))
    .filter(
      (p) =>
        (!filters.subjectId || p.subjectId === filters.subjectId) &&
        (!filters.seriesId || String(p.seriesId) === String(filters.seriesId)),
    )
}

/** @returns {Promise<TestPaper>} */
export const getPaper = (id) => api.get(`/api/admin/papers/${id}`).then((r) => r.data)

/**
 * A row from GET /api/admin/papers → the TestPaper shape the table and toasts read:
 *
 *   {id, title, series_id, series_name, subject_id, question_paper_pdf,
 *    question_paper_name, answer_key_pdf, duration_minutes, total_questions,
 *    has_question_paper, has_answer_key}
 *
 * `subject_id` is the backend INT (1 = FR, 2 = DT); everything in this app keys off
 * 'fin-fr'/'fin-dt', which is why the Subject badge and the subject filter were both
 * dead. `total_marks`, `unit`, `chapter_nos` and `released_on` have no columns
 * server-side — they survive only for the row we hand back after an upload.
 */
export const toPaper = (row = {}, input = {}) => ({
  id: row.id,

  name: row.title ?? input.name ?? 'Untitled Paper',

  seriesId: row.series_id ?? input.seriesId ?? null,

  /** The backend joins the series name in, so the table no longer needs the series list. */
  seriesName: row.series_name ?? null,

  subjectId:
    row.subject_id != null ? subjectIdFromBackend(row.subject_id) : (input.subjectId ?? null),

  durationMin: row.duration_minutes ?? input.durationMin ?? 60,

  totalQuestions: row.total_questions ?? 0,

  totalMarks: row.total_marks ?? input.totalMarks ?? null,

  unit: row.unit ?? input.unit ?? null,

  chapterNos: row.chapter_nos ?? input.chapterNos ?? [],

  questionPdfUrl: row.question_paper_pdf ?? null,

  questionPdfName:
    row.question_paper_name ??
    (
      row.question_paper_pdf
        ? row.question_paper_pdf.split('/').pop()
        : input.file?.name ?? null
    ),

  answerKeyUrl: row.answer_key_pdf ?? null,

  answerKeyId: (row.has_answer_key ?? Boolean(row.answer_key_pdf)) ? row.id : null,

  releasedOn: row.released_on ?? input.releasedOn ?? null,
})

/**
 * ⚠️ TWO REQUESTS, not one — that is the backend's actual contract and the reason
 * uploads were only half-landing. There is no POST /api/admin/papers; app_admin/routes.py
 * has:
 *
 *   POST /api/admin/tests                    JSON {title, series_id, duration_minutes}
 *   POST /api/admin/tests/<id>/upload-pdf    multipart, file field named **pdf**
 *
 * We were posting a single multipart body with the file under `file` to a route that
 * does not exist, so the Test row was never created and the PDF never stored.
 *
 * The PDF is uploaded second, so a rejected file leaves a Test with no paper rather than
 * a stored PDF with no Test. If the upload fails the id is reported, because the row IS
 * there and re-uploading against it is the recovery — silently swallowing that would
 * strand it.
 *
 * NOT SENT: subjectId, unit, totalMarks, chapterNos. The `tests` table has no columns for
 * them (shared/models/test.py), so they are kept client-side for this response only.
 * The Content-Type header is deleted so the browser sets its own multipart boundary.
 *
 * @param {UploadTestPaperInput} input
 * @returns {Promise<TestPaper>}
 */
export const uploadPaper = async (input) => {
  const { data: test } = await api.post('/api/admin/tests', {
    title: input.name,
    series_id: Number(input.seriesId),
    duration_minutes: Number(input.durationMin),
  })

  const form = new FormData()
  form.append('pdf', input.file)

  try {
    const { data: withPdf } = await api.post(`/api/admin/tests/${test.id}/upload-pdf`, form, {
      headers: { 'Content-Type': undefined },
    })
    return toPaper(withPdf, input)
  } catch (e) {
    e.message = `“${input.name}” was created (test #${test.id}) but the PDF did not upload: ${e.message}`
    throw e
  }
}

/** Metadata only — replacing the PDF is a re-upload. @returns {Promise<TestPaper>} */
export const updatePaper = (id, input) => api.put(`/api/admin/papers/${id}`, input).then((r) => r.data)

/**
 * A paper IS a Test row, and DELETE /api/admin/quizzes/<id> is the only route that deletes
 * one — there is no DELETE /api/admin/papers/<id>, so the old call always 404'd into the
 * "No API route" error.
 * @returns {Promise<{ ok: true }>}
 */
export const deletePaper = (id) => api.delete(`/api/admin/quizzes/${id}`).then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const paperKeys = {
  all: ['papers'],
  list: (filters = {}) => [...paperKeys.all, 'list', filters],
  detail: (id) => [...paperKeys.all, 'detail', id],
}

export const paperQueries = {
  list: (filters) => queryOptions({ queryKey: paperKeys.list(filters), queryFn: () => getPapers(filters) }),
  detail: (id) =>
    queryOptions({ queryKey: paperKeys.detail(id), queryFn: () => getPaper(id), enabled: Boolean(id) }),
}

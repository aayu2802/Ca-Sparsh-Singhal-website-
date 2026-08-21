import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'

/**
 * Answer keys. ⚠️ [VERIFY] — no student-app precedent; modelled 1:1 with a TestPaper.
 * See SHAPES.md before building the table.
 *
 * @typedef {import('@/types').AnswerKey} AnswerKey
 */

/** @returns {Promise<AnswerKey[]>} */
export const getAnswerKeys = () => api.get('/api/admin/answer-keys').then((r) => asArray(r.data))

/**
 * ⚠️ MULTIPART, file field named **pdf**, hung off the TEST — not a resource of its own.
 *
 *   POST /api/admin/tests/<test_id>/upload-answer-key-pdf
 *
 * We were posting to /api/admin/answer-keys with the file under `file`; no such route
 * exists, so nothing was ever stored. `maxMarks` and `notes` are NOT sent — the tests
 * table has only an `answer_key_pdf` column (shared/models/test.py).
 *
 * @param {{ testPaperId: string, file: File, maxMarks?: number|null, notes?: string|null }} input
 * @returns {Promise<AnswerKey>}
 */
export const uploadAnswerKey = async (input) => {
  const form = new FormData()
  form.append('pdf', input.file)

  const { data } = await api.post(
    `/api/admin/tests/${input.testPaperId}/upload-answer-key-pdf`,
    form,
    { headers: { 'Content-Type': undefined } },
  )
  return { id: data.id, testPaperId: data.id, pdfUrl: data.answer_key_pdf ?? null }
}

/** @returns {Promise<AnswerKey>} Metadata only — replacing the PDF is a re-upload. */
export const updateAnswerKey = (id, input) =>
  api.put(`/api/admin/answer-keys/${id}`, input).then((r) => r.data)

/** @returns {Promise<{ ok: true }>} */
export const deleteAnswerKey = (id) => api.delete(`/api/admin/answer-keys/${id}`).then((r) => r.data)

/** @returns {Promise<{ url: string }>} Short-lived signed URL. */
export const getAnswerKeyDownloadUrl = (id) =>
  api.get(`/api/admin/answer-keys/${id}/download`).then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const answerKeyKeys = {
  all: ['answerKeys'],
  list: () => [...answerKeyKeys.all, 'list'],
}

export const answerKeyQueries = {
  list: () => queryOptions({ queryKey: answerKeyKeys.list(), queryFn: getAnswerKeys }),
}

/**
 * Mapping check for GET /api/admin/papers and the DT chapter round-trip.
 *
 *   npx vite build --ssr src/api/papers.check.mjs --outDir tmp/papers-check
 *   node tmp/papers-check/papers.check.js
 *
 * Bundled through vite for the same reason as refresh.check.mjs: these modules import
 * '@/lib/subjects', and the '@' alias only exists inside vite's resolver.
 */
import assert from 'node:assert/strict'
import { toPaper } from './papers.js'
import { toApiInput, toFormValues } from '@/features/series/schema'

// ── One row, verbatim from the live response ─────────────────────────────────
const row = {
  answer_key_pdf: '/static/uploads/pdfs/1786520759_11.pdf',
  duration_minutes: 60,
  has_answer_key: true,
  has_question_paper: true,
  id: 8,
  question_paper_name: '1786520734_11.pdf',
  question_paper_pdf: '/static/uploads/pdfs/1786520734_11.pdf',
  series_id: 6,
  series_name: 'erp',
  subject_id: 2,
  title: 'test',
  total_questions: 0,
}

const p = toPaper(row)
assert.equal(p.id, 8)
assert.equal(p.name, 'test', 'title is the paper name')
assert.equal(p.subjectId, 'fin-dt', 'int subject_id must become the app subject id')
assert.equal(p.seriesId, 6)
assert.equal(p.seriesName, 'erp')
assert.equal(p.durationMin, 60)
assert.equal(p.questionPdfUrl, '/static/uploads/pdfs/1786520734_11.pdf')
assert.equal(p.questionPdfName, '1786520734_11.pdf')
assert.equal(p.answerKeyId, 8, 'has_answer_key true → the key badge reads Uploaded')

const noKey = toPaper({ ...row, id: 7, answer_key_pdf: null, has_answer_key: false })
assert.equal(noKey.answerKeyId, null, 'has_answer_key false → Missing, not Uploaded')

// The row synthesised locally right after an upload has none of the backend fields.
const local = toPaper({ id: 9 }, { name: 'Test 3', seriesId: '6', subjectId: 'fin-fr' })
assert.equal(local.name, 'Test 3')
assert.equal(local.subjectId, 'fin-fr')
assert.equal(local.durationMin, 60)

// ── A DT chapter name must survive save → reopen ─────────────────────────────
const values = {
  name: 'DT unit-wise',
  kind: 'series',
  subjectId: 'fin-dt',
  price: 0,
  validUntil: '2026-12-31',
  seatsRemaining: 0,
  briefDesc: 'x',
  longDesc: 'y',
  coverage: [{ value: 'Five unit tests' }],
  icon: 'Layers',
  hasUnitPlan: true,
  plan: [{ test: 1, title: 'Test 1', chapterNos: [{ value: '19.0', name: 'Assessment Procedures' }] }],
}

const sent = toApiInput(values)
assert.deepEqual(sent.plan[0].chapterNos, [{ no: '19.0', name: 'Assessment Procedures' }])

const reopened = toFormValues({ subjectId: 'fin-dt' }, sent.plan)
assert.deepEqual(reopened.plan[0].chapterNos, [{ value: '19.0', name: 'Assessment Procedures' }])

// Plans written before chapter names existed are bare strings; they must still open.
const legacy = toFormValues({ subjectId: 'fin-dt' }, [{ test: 1, title: 'Test 1', chapterNos: ['3'] }])
assert.deepEqual(legacy.plan[0].chapterNos, [{ value: '3', name: '' }])

console.log('papers mapping + DT chapter names: ok')

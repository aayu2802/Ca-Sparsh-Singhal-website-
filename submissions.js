import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'

/**
 * The evaluation queue — students upload handwritten answer sheets, faculty mark them and
 * send them back. This is the operational core of the business.
 *
 * ⚠️ [VERIFY] — the student app tracks this DEVICE-LOCALLY in progressStore; there is no
 * server shape yet. See SHAPES.md.
 *
 * Note: state is DERIVED — `evaluatedAt != null` means evaluated (that is the student
 * app's rule, ca/src/data/tests.js#submissionState). Do not add a status column that can
 * disagree with the timestamp.
 *
 * @typedef {import('@/types').Submission} Submission
 */

/**
 * @param {{ state?: 'pending'|'evaluated', seriesId?: string }} [filters]
 * @returns {Promise<Submission[]>}
 */
export const getSubmissions = (filters = {}) =>
  api.get('/api/admin/submissions', { params: filters }).then((r) => asArray(r.data))

/** @returns {Promise<Submission>} */
export const getSubmission = (id) => api.get(`/api/admin/submissions/${id}`).then((r) => r.data)

/**
 * Return a marked sheet. Sets `evaluatedAt` server-side — the client never sends a
 * timestamp it could get wrong or backdate.
 *
 * @param {string} id
 * @param {{ marksAwarded: number, feedback: string, evaluatorId: string }} input
 * @returns {Promise<Submission>}
 */
export const evaluateSubmission = (id, input) =>
  api.post(`/api/admin/submissions/${id}/evaluate`, input).then((r) => r.data)

/** @returns {Promise<{ url: string }>} Signed URL for the student's uploaded sheet. */
export const getAnswerSheetUrl = (id) =>
  api.get(`/api/admin/submissions/${id}/sheet`).then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const submissionKeys = {
  all: ['submissions'],
  list: (filters = {}) => [...submissionKeys.all, 'list', filters],
  detail: (id) => [...submissionKeys.all, 'detail', id],
}

export const submissionQueries = {
  list: (filters) =>
    queryOptions({ queryKey: submissionKeys.list(filters), queryFn: () => getSubmissions(filters) }),
}

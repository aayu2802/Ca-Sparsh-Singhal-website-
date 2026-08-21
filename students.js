import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'

/**
 * The buyer roster. ⚠️ [VERIFY] — extends the student app's AuthUser
 * (ca/src/features/auth/types.js) with commercial fields the student never sees. The
 * SHARED keys must stay identical to AuthUser. See SHAPES.md.
 *
 * @typedef {import('@/types').Student} Student
 */

/**
 * @param {{ q?: string, seriesId?: string }} [filters] `q` matches name, username or email.
 * @returns {Promise<Student[]>}
 */
export const getStudents = (filters = {}) =>
  api.get('/api/admin/students', { params: filters }).then((r) => asArray(r.data))

/** @returns {Promise<Student>} */
export const getStudent = (id) => api.get(`/api/admin/students/${id}`).then((r) => r.data)

/**
 * Grant access to a series without a payment — refunds, comps, support fixes.
 * Deliberately explicit rather than a general PUT on `ownedSeriesIds`: entitlements are
 * money, and an audit trail needs the verb.
 * @returns {Promise<Student>}
 */
export const grantSeriesAccess = (studentId, seriesId) =>
  api.post(`/api/admin/students/${studentId}/access`, { seriesId }).then((r) => r.data)

/** @returns {Promise<Student>} */
export const revokeSeriesAccess = (studentId, seriesId) =>
  api.delete(`/api/admin/students/${studentId}/access/${seriesId}`).then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const studentKeys = {
  all: ['students'],
  list: (filters = {}) => [...studentKeys.all, 'list', filters],
  detail: (id) => [...studentKeys.all, 'detail', id],
}

export const studentQueries = {
  list: (filters) =>
    queryOptions({ queryKey: studentKeys.list(filters), queryFn: () => getStudents(filters) }),
}

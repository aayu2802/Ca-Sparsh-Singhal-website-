import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'
import { toDoubt } from './adapters'

/**
 * ✅ Routes exist — app_admin/routes.py.
 *
 *   GET /api/admin/doubts             jwt + RESOLVE_DOUBTS  ⛔ 422 (JWT subject bug)
 *   PUT /api/admin/doubts/:id/reply   jwt + RESOLVE_DOUBTS  ⛔ 422
 *
 * Both are wired to the real paths and shapes; they start working the moment the
 * server signs its token with a string identity.
 *
 * Shape is translated in ./adapters — the backend's {title, description, status,
 * reply} is not this app's {body, answeredAt, answer}. Notably the backend records
 * NEITHER who replied NOR when, so `answeredBy` is always null and `answeredAt` is
 * derived from status. See SHAPES.md.
 *
 * @typedef {import('@/types').Doubt} Doubt
 */

/**
 * The backend returns ALL doubts with no filtering, so `answered` is applied client
 * side. That is fine at this scale but will not survive real volume — the endpoint
 * needs query params. Flagged in BACKEND_TODO.md.
 *
 * @param {{ answered?: boolean }} [filters]
 * @returns {Promise<Doubt[]>}
 */
export const getDoubts = (filters = {}) =>
  api
    .get('/api/admin/doubts')
    .then((r) => asArray(r.data).map(toDoubt))
    .then((rows) =>
      filters.answered == null
        ? rows
        : rows.filter((d) => Boolean(d.answeredAt) === Boolean(filters.answered)),
    )

/**
 * The backend takes only `reply` and sets status to 'Resolved' itself. It does not
 * accept or store an author, so `answeredBy` from the form is dropped here rather
 * than silently sent to a field that does not exist.
 *
 * @param {number} id
 * @param {{ answer: string }} input
 * @returns {Promise<Doubt>}
 */
export const answerDoubt = (id, input) =>
  api.put(`/api/admin/doubts/${id}/reply`, { reply: input.answer }).then((r) => toDoubt(r.data))

// ── Query layer ──────────────────────────────────────────────────────────────

export const doubtKeys = {
  all: ['doubts'],
  list: (filters = {}) => [...doubtKeys.all, 'list', filters],
}

export const doubtQueries = {
  list: (filters) =>
    queryOptions({ queryKey: doubtKeys.list(filters), queryFn: () => getDoubts(filters) }),
}

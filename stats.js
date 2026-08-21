import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/**
 * Dashboard statistics. ⚠️ [VERIFY] — new. ONE endpoint, ONE payload, so the dashboard is
 * a single request rather than nine. Scoped to the three metric groups that were asked
 * for: sales/revenue, the evaluation backlog, and student activity.
 *
 * Revenue is in WHOLE RUPEES (the student app uses no paise anywhere). A series priced
 * null contributes 0 revenue but still counts units sold — do not coerce null to 0 price.
 *
 * @typedef {import('@/types').Stats} Stats
 */

/**
 * @param {{ days?: number }} [range] trailing window for the time series. Default 30.
 * @returns {Promise<Stats>}
 */
export const getStats = (range = {}) =>
  api.get('/api/admin/stats', { params: range }).then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const statsKeys = {
  all: ['stats'],
  overview: (range = {}) => [...statsKeys.all, 'overview', range],
}

export const statsQueries = {
  overview: (range) =>
    queryOptions({ queryKey: statsKeys.overview(range), queryFn: () => getStats(range) }),
}

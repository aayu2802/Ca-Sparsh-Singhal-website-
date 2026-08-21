import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'
import { toTestSeries, fromTestSeries } from './adapters'

/**
 * Test series. The list is the STUDENT route (`GET /api/test-series`) because it is the
 * only listing endpoint that exists — app_admin/routes.py has POST /test-series and
 * nothing else. Detail, update and delete have no route at all; they will surface the
 * client's "No API route" error until the backend grows them. See BACKEND_TODO.md.
 *
 * Payload shaping lives in adapters.js — it used to be duplicated here, which is how the
 * two copies drifted apart.
 */

export const getTestSeries = async () => {
  const { data } = await api.get('/api/test-series')
  return asArray(data).map(toTestSeries)
}

export const getTestSeriesById = async (id) => {
  const { data } = await api.get(`/api/admin/test-series/${id}`)
  return toTestSeries(data)
}

export const createTestSeries = async (input) => {
  const { data } = await api.post('/api/admin/test-series', fromTestSeries(input))
  return toTestSeries(data)
}

export const updateTestSeries = async (id, input) => {
  const { data } = await api.put(`/api/admin/test-series/${id}`, fromTestSeries(input))
  return toTestSeries(data)
}

export const deleteTestSeries = async (id) => {
  const { data } = await api.delete(`/api/admin/test-series/${id}`)
  return data
}

/**
 * The unit plan is NOT stored server-side — TestSeries has no plan or coverage column,
 * and there is no /plan route. Resolving to [] keeps the Edit dialog openable (an
 * unhandled 404 here left the button doing nothing) while being honest that no plan
 * exists. Give it a real route and this becomes a real GET.
 */
export const getTestSeriesPlan = async () => []

// ── Query layer ──────────────────────────────────────────────────────────────

export const seriesKeys = {
  all: ['series'],
  list: () => ['series', 'list'],
  detail: (id) => ['series', 'detail', id],
  plan: (id) => ['series', 'plan', id],
}

export const seriesQueries = {
  list: () => queryOptions({ queryKey: seriesKeys.list(), queryFn: getTestSeries }),
  detail: (id) =>
    queryOptions({ queryKey: seriesKeys.detail(id), queryFn: () => getTestSeriesById(id), enabled: Boolean(id) }),
  plan: (id) =>
    queryOptions({ queryKey: seriesKeys.plan(id), queryFn: getTestSeriesPlan, enabled: Boolean(id) }),
}

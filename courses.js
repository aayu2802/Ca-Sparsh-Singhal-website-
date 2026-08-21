import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'

/**
 * ✅ LIVE. Backed by app_main/routes.py (reads) and app_admin/routes.py (writes).
 *
 *   GET    /api/courses           public         ✅ works
 *   GET    /api/courses/:id       public         ✅ works
 *   POST   /api/admin/courses     jwt + MANAGE_COURSES   ⛔ 422, see below
 *   DELETE /api/admin/courses/:id jwt + MANAGE_COURSES   ⛔ 422, see below
 *
 * NOTE the prefix change: main_bp moved from '/api/v1' to '/api' in run.py, so the
 * read paths are /api/courses now, not /api/v1/courses.
 *
 * ⛔ The two writes currently fail with 422 "Subject must be a string" — the backend
 * signs its JWT with an integer identity that flask-jwt-extended then refuses. That
 * is a one-line server fix; nothing here changes when it lands.
 *
 * @typedef {import('@/types').Course} Course
 */

/** @returns {Promise<Course[]>} */
export const getCourses = () => api.get('/api/courses').then((r) => asArray(r.data))

/** @returns {Promise<Course>} */
export const getCourse = (id) => api.get(`/api/courses/${id}`).then((r) => r.data)

/**
 * `title` is required — the controller 400s without it. `description` is optional.
 * @param {{ title: string, description?: string }} input
 * @returns {Promise<Course>} 201
 */
export const createCourse = (input) => api.post('/api/admin/courses', input).then((r) => r.data)

/**
 * @param {number} id integer — the route is <int:course_id>, so a non-numeric id 404s.
 * @returns {Promise<null>} the backend returns a message only, no data.
 */
export const deleteCourse = (id) => api.delete(`/api/admin/courses/${id}`).then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const courseKeys = {
  all: ['courses'],
  list: () => [...courseKeys.all, 'list'],
  detail: (id) => [...courseKeys.all, 'detail', id],
}

export const courseQueries = {
  list: () => queryOptions({ queryKey: courseKeys.list(), queryFn: getCourses }),
  detail: (id) =>
    queryOptions({
      queryKey: courseKeys.detail(id),
      queryFn: () => getCourse(id),
      enabled: Boolean(id),
    }),
}

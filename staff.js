import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'
import { toStaff, fromStaff, collapsePermissions } from './adapters'

/**
 * ✅ Routes exist — app_admin/routes.py, all @super_admin_required.
 *
 *   GET    /api/admin/staff                    ⛔ 422 (JWT subject bug)
 *   POST   /api/admin/staff                    ⛔ 422
 *   PUT    /api/admin/staff/:id/permissions    ⛔ 422
 *   DELETE /api/admin/staff/:id                ⛔ 422
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ THREE THINGS THAT DIVERGE FROM WHAT THIS PANEL WAS BUILT FOR:
 *
 * 1. NO BOOTSTRAP. Creating staff requires super_admin, and there is no staff login
 *    route — /api/auth/login authenticates the `users` table while these decorators
 *    read the `staff` table. So the first super_admin cannot be created through the
 *    API at all. This blocks the entire admin panel, not just this screen.
 *
 * 2. THREE PERMISSIONS, NOT THIRTY. The server understands MANAGE_COURSES,
 *    RESOLVE_DOUBTS and MANAGE_TESTS. This app's fine-grained keys are collapsed
 *    into those on write and expanded back on read (see ./adapters), which is
 *    LOSSY: granting "upload papers but not delete papers" is not expressible
 *    server-side — both live under MANAGE_TESTS.
 *
 * 3. THERE IS A DELETE. This app deliberately deactivates instead, because staff own
 *    evaluations and deleting orphans them. `setStaffStatus` therefore uses the
 *    permissions endpoint's `is_active` flag, NOT the DELETE route. The DELETE is
 *    left unwired on purpose.
 *
 * And the standing caveat: frontend permission checks are UX. The backend already
 * re-checks via @permission_required — keep it that way.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * @typedef {import('@/types').Staff} Staff
 */

/** @returns {Promise<Staff[]>} */
export const getStaff = () => api.get('/api/admin/staff').then((r) => asArray(r.data).map(toStaff))

/**
 * ⚠️ The backend REQUIRES a password here and has no invite flow, so the form must
 * collect one. It ignores `role` entirely — every created row is 'staff'.
 * @param {{ name, email, password, permissions: string[] }} input
 * @returns {Promise<Staff>}
 */
export const createStaff = (input) =>
  api.post('/api/admin/staff', fromStaff(input)).then((r) => toStaff(r.data))

/**
 * The only update route takes `permissions` and `is_active` — name, email and role
 * cannot be edited server-side, so this app cannot offer that.
 * @returns {Promise<Staff>}
 */
export const updateStaff = (id, input) =>
  api
    .put(`/api/admin/staff/${id}/permissions`, {
      permissions: collapsePermissions(input.permissions),
      is_active: input.status !== 'inactive',
    })
    .then((r) => toStaff(r.data))

/**
 * Deactivate, never delete. Uses the permissions endpoint's is_active flag; the
 * backend's DELETE /api/admin/staff/:id is deliberately not wired — see note 3.
 * @param {'active'|'inactive'} status
 * @returns {Promise<Staff>}
 */
export const setStaffStatus = (id, status) =>
  api
    .put(`/api/admin/staff/${id}/permissions`, { is_active: status === 'active' })
    .then((r) => toStaff(r.data))

// ── Query layer ──────────────────────────────────────────────────────────────

export const staffKeys = {
  all: ['staff'],
  list: () => [...staffKeys.all, 'list'],
}

export const staffQueries = {
  list: () => queryOptions({ queryKey: staffKeys.list(), queryFn: getStaff }),
}

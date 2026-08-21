import { api } from './client'
import { toStaff } from './adapters'

/**
 * ✅ Wired to the real staff auth model — app_auth/routes.py.
 *
 *   POST /api/auth/staff-login  → {access_token, refresh_token, staff}
 *   GET  /api/auth/me           → the caller's own row + account_type
 *   POST /api/auth/refresh      → {access_token}
 *
 * This replaces the previous ID-collision workaround. The backend now issues staff
 * tokens carrying `is_staff: true` and a `role` claim, resolves them against the
 * `staff` table, and exposes /me so a NON-super staff member can finally discover
 * their own permissions. Logging in as a student is no longer a route into the panel.
 *
 * `/api/auth/login` (the student route) is deliberately NOT used here — it returns a
 * `users` row and its token is rejected by `/api/auth/profile` for staff. The admin
 * panel is staff-only.
 *
 * @typedef {import('@/types').AdminSession} AdminSession
 */

/**
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<AdminSession>} normalised to {token, refreshToken, user}
 */
export const login = async (credentials) => {
  const r = await api.post('/api/auth/staff-login', credentials)
  const body = r.data

  /**
   * The account row is under `staff` on the staff route (`user` on the student one).
   * Accept either, then fail LOUDLY if neither is present.
   *
   * Without this guard an unexpected payload reached toStaff() as `undefined` and blew
   * up with "Cannot read properties of undefined (reading 'id')" — a message that says
   * nothing about the real problem, which is always one of:
   *   • a stale bundle/dev server still reading the old key
   *   • the request never reached Flask (proxy off → SPA HTML came back instead)
   *   • the response shape changed server-side
   */
  const account = body?.staff ?? body?.user
  if (!account || !body?.access_token) {
    const err = new Error(
      'Login response was not in the expected shape. The request may not have reached the ' +
        'API — check that the Flask backend is running and that /api is being proxied.',
    )
    err.body = body
    throw err
  }

  return { token: body.access_token, refreshToken: body.refresh_token, user: toStaff(account) }
}

/**
 * There is no logout route — JWTs are stateless here and nothing is blocklisted, so
 * clearing the local token IS the logout. Resolving without a call avoids a 404 on
 * every sign-out.
 */
export const logout = async () => ({ ok: true })

/**
 * Rehydrate on reload, and the only way a non-super staff member learns their own
 * permissions. Returns the staff row plus `account_type`.
 *
 * A student token reaching here would come back with account_type 'student' and no
 * permissions — correct, since the panel is staff-only.
 *
 * @returns {Promise<import('@/types').AdminUser>}
 */
export const getCurrentAdmin = () =>
  api.get('/api/auth/me').then((r) =>
    r.data?.account_type === 'staff'
      ? toStaff(r.data)
      : { id: r.data?.id, name: r.data?.name, email: r.data?.email, role: 'viewer', permissions: [], subjectScope: [] },
  )

/**
 * Exchange the refresh token for a new access token. Note it must be sent as the
 * bearer — flask-jwt-extended reads the REFRESH token from the Authorization header
 * on this route, not the access token.
 * @returns {Promise<{ access_token: string }>}
 */
export const refresh = (refreshToken) =>
  api
    .post('/api/auth/refresh', null, { headers: { Authorization: `Bearer ${refreshToken}` } })
    .then((r) => r.data)

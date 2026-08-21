import axios from 'axios'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

/**
 * The ONE axios instance. Nothing outside src/api/ imports axios or names a URL.
 *
 * baseURL points at the Flask server (ca_backend/run.py listens on 127.0.0.1:5000).
 * Live calls use its real paths — /api/v1/... and /api/admin/... — while domains that
 * have no route yet use bare /admin/... paths the mock layer intercepts. The two
 * namespaces deliberately don't overlap, so a mocked call can never leak to the
 * network and a live call can never be swallowed by a mock.
 */
export const api = axios.create({
  // Same-origin by default: the Vite dev proxy forwards /api to the Flask server.
  // That is what makes the calls work at all — the backend sends no CORS headers, so
  // a direct cross-origin request from the browser is blocked before it is sent.
  // Tests run in node with no proxy, so they set VITE_BASE_URL to the backend origin.
  baseURL: import.meta.env.VITE_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Auth. Reads the store lazily, per request — so a login mid-session takes effect on the
 * next call with no re-registration, and no token is captured at module load.
 *
 * NOTE: the Flask backend has no auth route and checks no token today. This header is
 * sent anyway so the seam is already correct when auth lands.
 */
/** flask-jwt-extended reads the REFRESH token from Authorization on this one route. */
const REFRESH_URL = '/api/auth/refresh'

api.interceptors.request.use((config) => {
  // The refresh call carries the refresh token in its own header. Stamping the (expired)
  // access token over it is the classic way to make refresh 401 forever.
  if (config.url === REFRESH_URL) return config
  const token = useAdminAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * In-flight refresh, shared. A dashboard fires ~6 queries at once; when the access token
 * expires they all 401 together. Without this they would each POST /api/auth/refresh, and
 * the last five would race the first one's rotation. One promise, everyone awaits it.
 */
let renewal = null

const renewAccessToken = () => {
  if (renewal) return renewal

  const { refreshToken } = useAdminAuthStore.getState()
  if (!refreshToken) return Promise.reject(new Error('No refresh token to renew with.'))

  renewal = api
    .post(REFRESH_URL, null, { headers: { Authorization: `Bearer ${refreshToken}` } })
    .then((res) => {
      // AuthController.refresh returns {access_token} inside the standard envelope,
      // which the response interceptor below has already unwrapped.
      const next = res.data?.access_token
      if (typeof next !== 'string') throw new Error('Refresh returned no access token.')
      useAdminAuthStore.getState().setToken(next)
      return next
    })
    .finally(() => {
      renewal = null
    })

  return renewal
}

/**
 * The refresh token is dead too. Clear the session and get out of the app — the router
 * guard only runs on navigation, so without this the user sits on a page whose every
 * request 401s, which reads as "the app is broken" rather than "you are signed out".
 */
const endSession = () => {
  const { token, clearSession } = useAdminAuthStore.getState()
  if (!token) return // already signed out — never loop
  clearSession()

  if (typeof window === 'undefined') return
  if (window.location.pathname.startsWith('/login')) return
  window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
}

/**
 * Response normalisation, so no component ever unwraps an envelope or reads `err.response`.
 *
 * The backend wraps everything in shared/utils/response.py:
 *     { "success": bool, "message": str, "data": ... }
 * We hand back the inner `data`. A response that is already the payload passes through
 * unchanged, so this keeps working if the envelope is ever dropped.
 *
 * `success: false` with a 2xx status is treated as a FAILURE — the backend's own
 * contract says so, and trusting the status code alone would surface an error as data.
 */
api.interceptors.response.use(
  (res) => {
    /**
     * ⚠️ A 200 is not proof the request hit a route.
     *
     * run.py registers a catch-all `@app.route("/<path:path>")` that serves index.html,
     * and it wins for any /api path no blueprint claims. Verified live:
     *     GET /api/admin/papers → 200 text/html   (the SPA shell)
     * The screens then get an HTML STRING where they expect an array, which is the whole
     * "x.map is not a function" family of crashes. Reject non-JSON here, once, so a
     * missing route surfaces as the page's error state instead of a white screen.
     */
    if (!String(res.headers?.['content-type'] ?? '').includes('json')) {
      const err = new Error(
        `No API route for ${res.config?.method?.toUpperCase() ?? 'GET'} ${res.config?.url} — ` +
          'the server answered with the app shell, not data. That endpoint does not exist yet.',
      )
      err.status = 404
      err.missingRoute = true
      return Promise.reject(err)
    }

    const body = res.data
    const enveloped = body && typeof body === 'object' && !Array.isArray(body) && 'data' in body

    if (enveloped && body.success === false) {
      const err = new Error(body.message || 'The request failed.')
      err.status = res.status
      err.body = body
      return Promise.reject(err)
    }
    if (enveloped) res.data = body.data
    return res
  },
  async (err) => {
    const status = err.response?.status
    const body = err.response?.data
    const config = err.config

    /**
     * 401 → renew once, then replay the original request.
     *
     * `_retried` bounds it to a single attempt per request, so a token the server keeps
     * rejecting cannot become an infinite loop. The refresh call itself is excluded: if
     * THAT 401s the refresh token is dead, and the only honest move is to sign out.
     */
    if (status === 401 && config && !config._retried && config.url !== REFRESH_URL) {
      config._retried = true
      try {
        await renewAccessToken()
        return api(config) // re-runs the request interceptor, so it carries the new token
      } catch {
        endSession()
      }
    }

    /**
     * flask-jwt-extended rejects its own token: app_auth/routes.py issues
     * create_access_token(identity=user.id) with an INT, and v4.6 requires a string
     * subject. Every @jwt_required route 422s with this. Translate it, because
     * "Subject must be a string" tells an admin nothing about what to do.
     */
    if (body?.msg === 'Subject must be a string') {
      const e = new Error(
        'The backend rejected its own login token (JWT subject must be a string). ' +
          'Every protected route is blocked until that is fixed server-side.',
      )
      e.status = status
      e.body = body
      e.backendBug = 'jwt-subject-type'
      return Promise.reject(e)
    }

    const message =
      body?.message ??
      body?.error ??
      body?.msg ??
      (status === 401
        ? 'Your session has expired. Log in again.'
        : status === 403
          ? 'You do not have permission to do that.'
          : status === 413
            ? 'That file is too large to upload.'
            : status >= 500
              ? 'The server had a problem. Nothing was saved.'
              : err.code === 'ERR_NETWORK'
                ? 'Could not reach the server. Is the Flask backend running on port 5000?'
                : (err.message ?? 'Something went wrong.'))

    const normalised = new Error(message)
    normalised.status = status
    normalised.body = body
    return Promise.reject(normalised)
  },
)

/**
 * The mock layer has been removed. Every request in this app now goes to the Flask
 * backend at VITE_BASE_URL (or, in dev, through the Vite proxy to it). A screen whose
 * endpoint does not exist yet will show its error state — see BACKEND_TODO.md.
 */

/**
 * A list endpoint returns a LIST. Enforced here, at the API seam, because that is the one
 * place that knows a given call is supposed to be a collection.
 *
 * The screens all wrote `(query.data ?? []).map(…)`, which survives null and undefined but
 * NOT a string or an object — and the crashes in production were exactly that: the SPA
 * catch-all answering with an HTML string. The interceptor above now rejects HTML, but
 * `data: null`, `{}` or a paginated `{items: []}` would land the same way, in ~20 call
 * sites. One guard per endpoint beats twenty per screen.
 *
 * It WARNS rather than swallowing quietly — an unexpected shape is a contract change worth
 * seeing in the console, just not worth taking the page down for.
 */
export const asArray = (value) => {
  if (Array.isArray(value)) return value

  // Backend API envelope:
  // { data: [...], success: true, message: "..." }
  if (value && Array.isArray(value.data)) {
    return value.data
  }

  if (value != null) {
    console.warn('[api] expected an array or { data: [] }, got', value)
  }

  return []
}

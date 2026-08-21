/**
 * Behaviour check for the 401 → refresh → replay flow in client.js.
 *
 *   npx vite build --ssr src/api/refresh.check.mjs --outDir tmp/refresh-check
 *   node tmp/refresh-check/refresh.check.js      (vite emits .js; package.json is type:module)
 *
 * The "[zustand persist] storage is currently unavailable" lines are expected — node has
 * no localStorage, and persistence is not what this checks.
 *
 * Bundled through vite because client.js imports '@/stores/adminAuthStore', and the '@'
 * alias only exists inside vite's resolver. No test framework — a fake Flask stands in for
 * the backend and the asserts are plain node.
 *
 * What is actually at risk here, and therefore what this pins down:
 *   1. a 401 must renew and REPLAY, not surface to the caller
 *   2. N parallel 401s must cause exactly ONE refresh (the dashboard fires ~6 at once)
 *   3. a dead refresh token must clear the session rather than retry forever
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import { api } from './client.js'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

let refreshHits = 0
let statsHits = 0

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = http.createServer((req, res) => {
  const auth = req.headers.authorization

  if (req.url === '/api/auth/refresh') {
    refreshHits += 1
    return auth === 'Bearer refresh-good'
      ? json(res, 200, { success: true, message: 'Token refreshed', data: { access_token: 'access-new' } })
      : json(res, 401, { success: false, error: 'Not enough segments' })
  }

  if (req.url === '/api/admin/stats') {
    statsHits += 1
    return auth === 'Bearer access-new'
      ? json(res, 200, { success: true, message: 'ok', data: { ok: true } })
      : json(res, 401, { success: false, error: 'Token has expired' })
  }

  json(res, 404, { success: false, message: 'no route' })
})

await new Promise((r) => server.listen(0, '127.0.0.1', r))
api.defaults.baseURL = `http://127.0.0.1:${server.address().port}`

// ── 1 + 2: expired access token, healthy refresh token ───────────────────────
useAdminAuthStore.setState({ token: 'access-expired', refreshToken: 'refresh-good', user: { id: 1 } })

const results = await Promise.all([
  api.get('/api/admin/stats'),
  api.get('/api/admin/stats'),
  api.get('/api/admin/stats'),
])

for (const r of results) {
  assert.deepEqual(r.data, { ok: true }, 'a 401 must be replayed transparently, not surfaced')
}
assert.equal(refreshHits, 1, `3 parallel 401s must trigger exactly 1 refresh, got ${refreshHits}`)
assert.equal(statsHits, 6, 'each request runs twice: once 401, once replayed')
assert.equal(useAdminAuthStore.getState().token, 'access-new', 'the new access token must be stored')

// ── 3: refresh token is dead too → session ends, no infinite retry ───────────
refreshHits = 0
useAdminAuthStore.setState({ token: 'access-expired', refreshToken: 'refresh-dead', user: { id: 1 } })

await assert.rejects(() => api.get('/api/admin/stats'), 'a dead refresh token must surface the error')
assert.equal(refreshHits, 1, 'one refresh attempt only — never a loop')
assert.equal(useAdminAuthStore.getState().token, null, 'the session must be cleared')
assert.equal(useAdminAuthStore.getState().refreshToken, null, 'the refresh token must be cleared too')
assert.equal(useAdminAuthStore.getState().user, null, 'the user must be cleared')

// ── 4: no refresh token at all (a session from before this change) ───────────
useAdminAuthStore.setState({ token: 'access-expired', refreshToken: null, user: { id: 1 } })
await assert.rejects(() => api.get('/api/admin/stats'))
assert.equal(useAdminAuthStore.getState().token, null, 'a tokenless session must be cleared, not looped')

server.close()
console.log('refresh flow: ok')

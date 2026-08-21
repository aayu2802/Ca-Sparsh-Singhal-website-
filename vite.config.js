import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Config is a FUNCTION so it can call loadEnv().
 *
 * `process.env.VITE_BACKEND_ORIGIN` does not work here: Vite loads .env files into
 * import.meta.env for the CLIENT, but it does not put them on process.env before it
 * evaluates this file. Reading process.env therefore silently fell back to
 * 127.0.0.1:5000 no matter what .env.local said — the proxy target has to come from
 * loadEnv, which reads the .env files itself.
 */
export default defineConfig(({ mode }) => {
  // '' = no prefix filter, so unprefixed vars work here too.
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:5000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      /**
       * Production sends no CORS headers — the OPTIONS preflight is answered by
       * LiteSpeed before Flask-CORS ever runs. Proxying makes /api same-origin in dev,
       * so the browser never does a cross-origin request and nothing server-side has to
       * change. This does NOT fix production: the panel must be served from the same
       * origin as the API there, which it is.
       *
       * Keep VITE_BASE_URL empty so axios calls /api on this dev server. Pointing it at
       * the hosted origin bypasses this proxy entirely and reintroduces the CORS failure.
       *
       * `secure: false` skips TLS verification ON THE PROXY HOP ONLY. It is needed
       * because admin.casparshsinghal.in serves a SELF-SIGNED certificate (subject ==
       * issuer == the hostname — cPanel's placeholder; AutoSSL never issued a real one),
       * which Node rejects with DEPTH_ZERO_SELF_SIGNED_CERT.
       *
       * ⚠️ Dev-only, and it is masking a live problem: that same cert is why the
       * production panel shows a browser security interstitial. Install a valid
       * certificate, then delete these two flags.
       */
      proxy: {
        '/api': { target: BACKEND, changeOrigin: true, secure: false },
        '/static': { target: BACKEND, changeOrigin: true, secure: false }, // uploaded PDFs live here
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  }
})

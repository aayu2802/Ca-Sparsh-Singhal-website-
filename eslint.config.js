import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // The Flask app is not ours to lint, and its venv ships vendored JS (Werkzeug's
  // debugger) that trips no-undef on globals it defines at runtime. Glob-matched
  // because the folder gets copied around with suffixes.
  globalIgnores(['dist', 'ca_backend*', '**/venv/**']),
  // Vite's config runs in node, not the browser — it needs `process`.
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])

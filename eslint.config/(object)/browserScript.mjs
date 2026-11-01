// @ts-check
import globals from 'globals'

// page/'s scripts run in the browser, as classic scripts sharing one scope:
// Chart.js comes from its CDN tag, raw, project and scope from the data.js
// each render writes.
/** @type {import('eslint').Linter.Config} */
export const eslintConfigBrowserScript = {
  files: ['page/**/*.js'],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2022,
      Chart: 'readonly',
      project: 'readonly',
      raw: 'readonly',
      scope: 'readonly',
    },
    sourceType: 'script',
  },
}

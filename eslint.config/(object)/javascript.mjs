// @ts-check
import js from '@eslint/js'

// The shared eslint core (base.mjs) only covers TypeScript; this covers the
// plain scripts of page/, which render copies into a project unbuilt.
/** @type {import('eslint').Linter.Config} */
export const eslintConfigJavascript = {
  files: ['page/**/*.js'],
  rules: {
    ...js.configs.recommended.rules,
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
}

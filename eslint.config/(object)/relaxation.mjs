// @ts-check
/**
 * Loosens a handful of `eslintConfigBase` rules for active local iteration —
 * merged onto `eslintConfigStrict` by `(array)/(strict)/relaxed.mjs`,
 * selected explicitly via the `lint:src:relaxed` npm script
 * (`eslint.relaxed.config.mjs`), never automatically.
 *
 * That's a workflow-stage choice, not an environment one — there's no
 * runtime "environment" during a static lint pass, so it's selected by
 * which npm script you run, never by `.env`/`NODE_ENV` detection.
 */

import { eslintConfigBase } from './base.mjs'

/** @type {import('eslint').Linter.Config} */
export const eslintConfigBaseRelaxation = {
  files: eslintConfigBase.files,
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    'no-debugger': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-readonly': 'warn',
  },
}

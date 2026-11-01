// @ts-check
import { resolve } from 'node:path'

import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import-x'
import promise from 'eslint-plugin-promise'
import security from 'eslint-plugin-security'
import unicorn from 'eslint-plugin-unicorn'
import globals from 'globals'

import { pluginNoVisibilityWidening } from '../(plugin)/noVisibilityWidening.mjs'
import { pluginRequireOverrideForAbstract } from '../(plugin)/requireOverrideForAbstract.mjs'

import { findProjectRootDir } from './base/findProjectRootDir.mjs'
import { deriveForPluginImportX } from './forPluginImportX/derive.mjs'

const rootDir = findProjectRootDir(import.meta.dirname)
// tsconfig.json is a solution with no files of its own; the test program is
// the one that covers src/, the tests beside it and test/.
const tsconfigPath = resolve(rootDir, 'tsconfig.test.json')
const forPluginImportX = deriveForPluginImportX(tsconfigPath)

// Several of these plugins' types don't structurally satisfy ESLint's Plugin
// interface (surfaced in-editor via ATA); all are valid plugins at runtime,
// so assert the map shape.
/** @type {NonNullable<import('eslint').Linter.Config['plugins']>} */
export const basePlugins =
  /** @type {import('eslint').Linter.Config['plugins']} */ (
    /** @type {unknown} */ ({
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
      localRules: {
        rules: {
          ...pluginRequireOverrideForAbstract.rules,
          ...pluginNoVisibilityWidening.rules,
        },
      },
      promise,
      security,
      unicorn,
    })
  )

/** @type {import('eslint').Linter.RulesRecord} */
export const baseRules = {
  // Foundation: eslint:recommended. typescript-eslint's own recommended
  // configs assume this is already active — it isn't superseded, it's
  // extended by everything below.
  ...js.configs.recommended.rules,

  // Base rules superseded by a type-aware equivalent below.
  'no-dupe-class-members': 'off',
  'no-implied-eval': 'off',
  'no-loss-of-precision': 'off',
  'no-magic-numbers': 'off',
  'no-unused-vars': 'off',

  // Common rules. A short-lived CLI: its whole job is reporting to the
  // terminal, and sync calls block nothing else, so no-console and no-sync
  // have nothing to guard here.
  curly: ['error', 'all'],
  'no-buffer-constructor': 'error',
  'no-debugger': 'error',
  'no-eval': 'error',
  'no-process-exit': 'error',
  'prefer-promise-reject-errors': 'error',
  'no-restricted-syntax': [
    'error',
    {
      selector: 'WithStatement',
      message: 'with is disallowed in strict mode.',
    },
    {
      selector: 'ForInStatement',
      message: 'for..in is disallowed. Use Object.keys/entries/values instead.',
    },
  ],

  // Import rules — shared with self.mjs, see forPluginImportX/derive.mjs
  ...forPluginImportX.rules,

  // Promise rules
  'promise/always-return': 'error',
  'promise/avoid-new': 'error',
  'promise/catch-or-return': 'error',
  'promise/no-callback-in-promise': 'error',
  'promise/no-nesting': 'error',
  'promise/no-promise-in-callback': 'error',
  'promise/no-return-wrap': 'error',
  'promise/param-names': 'error',

  // Unicorn rules
  'unicorn/catch-error-name': 'error',
  'unicorn/filename-case': [
    'error',
    {
      cases: {
        camelCase: true,
        pascalCase: true,
      },
    },
  ],
  'unicorn/no-array-reduce': 'error',
  'unicorn/no-instanceof-array': 'error',
  // Off: a graph point is JSON, where a value not measured is null (Chart.js
  // leaves a gap for it), and undefined would drop the key.
  'unicorn/no-null': 'off',
  'unicorn/prefer-node-protocol': 'error',
  'unicorn/prefer-ternary': 'error',

  // Security rules
  // eslint-plugin-security ships no types, so with ATA off the editor infers
  // `configs` as {}. Assert the shape of the one member we read (its
  // recommended ruleset) — valid at runtime, consistent with the plugin casts.
  .../** @type {{ recommended: { rules: import('eslint').Linter.RulesRecord } } } */ (
    security.configs
  ).recommended.rules,
  'security/detect-object-injection': 'error',
  // Off: every path comes from the project's own root, config and the
  // snapshot names this tool writes, never from attacker-influenced input.
  'security/detect-non-literal-fs-filename': 'off',
  'security/detect-possible-timing-attacks': 'error',

  // TypeScript rules
  ...(typescriptEslint.configs.recommended?.rules ?? {}),
  ...(typescriptEslint.configs['recommended-requiring-type-checking']?.rules ??
    {}),
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
  ],
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    {
      allowExpressions: false,
      allowTypedFunctionExpressions: false,
      allowHigherOrderFunctions: false,
      allowDirectConstAssertionInArrowFunctions: false,
      allowConciseArrowFunctionExpressionsStartingWithVoid: false,
    },
  ],
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-base-to-string': 'error',
  '@typescript-eslint/no-dupe-class-members': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
  '@typescript-eslint/no-implied-eval': 'error',
  // Disallow explicit type annotations that are obvious from the initializer
  '@typescript-eslint/no-inferrable-types': [
    'error',
    { ignoreParameters: true, ignoreProperties: true },
  ],
  '@typescript-eslint/no-magic-numbers': [
    'error',
    {
      ignore: [-1, 0, 1],
      ignoreEnums: true,
      ignoreNumericLiteralTypes: true,
      ignoreReadonlyClassProperties: true,
      ignoreTypeIndexes: true,
    },
  ],
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/no-redundant-type-constituents': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      caughtErrors: 'none',
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/prefer-nullish-coalescing': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/prefer-ts-expect-error': 'error',
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/restrict-template-expressions': [
    'error',
    {
      allowAny: false,
      allowBoolean: true,
      allowNullish: true,
      allowNumber: true,
    },
  ],
  '@typescript-eslint/strict-boolean-expressions': [
    'error',
    {
      allowString: false,
      allowNumber: false,
      allowNullableObject: false,
      allowNullableBoolean: false,
      allowNullableString: false,
      allowNullableNumber: false,
      allowAny: false,
    },
  ],
  '@typescript-eslint/unbound-method': 'error',

  // Local custom rules
  'localRules/no-visibility-widening': 'error',
  'localRules/require-override-for-abstract': 'error',
}

/** @type {import('eslint').Linter.Config} */
export const eslintConfigBase = {
  files: ['src/**/*.ts', 'test/**/*.ts'],
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.es2022,
    },
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      // Absolute, like tsconfigPath above — no tsconfigRootDir needed to
      // resolve a relative one.
      project: tsconfigPath,
      sourceType: 'module',
    },
  },
  plugins: basePlugins,
  rules: baseRules,
  settings: forPluginImportX.settings,
}

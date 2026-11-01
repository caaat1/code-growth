// @ts-check
import { resolve } from 'node:path'

import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import-x'
import globals from 'globals'

import { deriveForPluginImportX } from './forPluginImportX/derive.mjs'

const jsconfigPath = resolve(import.meta.dirname, '../jsconfig.json')
const forPluginImportX = deriveForPluginImportX(jsconfigPath)

/** @type {import('eslint').Linter.Config} */
export const eslintConfigSelf = {
  files: ['eslint.config.mjs', 'eslint.config/**/*.mjs'],
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.es2022,
    },
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  // eslint-plugin-import-x's types don't structurally satisfy ESLint's Plugin
  // interface (surfaced in-editor via ATA); valid at runtime, so assert the
  // map shape, consistent with base.mjs's plugin casts.
  plugins: /** @type {import('eslint').Linter.Config['plugins']} */ (
    /** @type {unknown} */ ({
      import: importPlugin,
    })
  ),
  rules: {
    ...js.configs.recommended.rules,
    curly: ['error', 'all'],
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],

    // Import rules — shared with base.mjs, see forPluginImportX/derive.mjs.
    // jsconfig.json has no path aliases yet, so pathGroups is currently []
    // and the resolver settings below are unexercised — ready for whenever
    // it gains any.
    ...forPluginImportX.rules,
  },
  settings: forPluginImportX.settings,
}

// Type-aware layer, scoped to eslint.config/ only (not the root eslint.config.mjs
// entry file, whose nearest config is still the root tsconfig.json). `project` is
// omitted in favour of projectService — it discovers the nearest config itself,
// which for this tree is `eslint.config/jsconfig.json`.
/** @type {import('eslint').Linter.Config} */
export const eslintConfigSelfTypeAware = {
  files: ['eslint.config/**/*.mjs'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: false,
      projectService: true,
    },
  },
  // @typescript-eslint's published types don't structurally satisfy ESLint's
  // Plugin interface, though it is a valid plugin at runtime. Assert the map
  // shape so the Linter.Config annotation above stays honest for every other field.
  plugins: /** @type {import('eslint').Linter.Config['plugins']} */ (
    /** @type {unknown} */ ({
      '@typescript-eslint': typescriptEslint,
    })
  ),
  rules: {
    'no-unused-vars': 'off',
    ...(typescriptEslint.configs.recommended?.rules ?? {}),
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
        varsIgnorePattern: '^_',
      },
    ],
  },
}

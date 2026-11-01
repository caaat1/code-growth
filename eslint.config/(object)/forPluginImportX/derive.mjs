// @ts-check
import { getAliasPathGroups } from './getAliasPathGroups.mjs'

/**
 * Shared `import/*` rule block, reused by `base.mjs` (src/, against the
 * root tsconfig.json) and `self.mjs` (eslint.config/, against its own
 * jsconfig.json). `configFilePath` feeds both `import/order`'s
 * `pathGroups` (so each tree's own path aliases sort into their own
 * group) and `import/no-unresolved`'s resolver (so it knows which
 * tsconfig/jsconfig to resolve those aliases against) — one path in,
 * both derived from it, so neither can drift from the other.
 *
 * @param {string} configFilePath Absolute path to the tsconfig.json/jsconfig.json governing the linted files.
 * @returns {{ rules: import('eslint').Linter.RulesRecord, settings: NonNullable<import('eslint').Linter.Config['settings']> }}
 */
export function deriveForPluginImportX(configFilePath) {
  return {
    rules: {
      'import/extensions': [
        'error',
        'ignorePackages',
        // Source extensions (resolved-to) never appear in specifiers; runtime
        // extensions always do. Without the mts/cts entries the rule falls back
        // to demanding the *resolved* extension (e.g. a `.d.mts` neighbor) on
        // `.mjs` imports.
        {
          cjs: 'always',
          cts: 'never',
          js: 'always',
          mjs: 'always',
          mts: 'never',
          ts: 'never',
        },
      ],
      'import/newline-after-import': ['error', { count: 1 }],
      'import/no-absolute-path': 'error',
      'import/no-commonjs': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          // Derived from configFilePath's `paths` — single source of truth.
          pathGroups: getAliasPathGroups(configFilePath),
          pathGroupsExcludedImportTypes: [
            'builtin',
            'external',
            'object',
            'type',
          ],
          'newlines-between': 'always',
        },
      ],
    },
    settings: {
      // eslint-plugin-import-x's rule implementations hardcode the
      // 'import-x/*' settings prefix regardless of the local name the plugin
      // is registered under in `plugins` (that local name only governs rule
      // IDs, e.g. 'import/order' below) — 'import/resolver' here would be
      // silently ignored.
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: configFilePath,
        },
      },
    },
  }
}

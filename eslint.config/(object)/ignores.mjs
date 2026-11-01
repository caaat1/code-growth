// @ts-check

/**
 * Global ignores. Flat config special-cases a config object whose *only*
 * key is `ignores`: those paths are removed from consideration before any
 * other config object gets a chance to match them, so every other entry in
 * `eslint.config.mjs`'s `defineConfig` array is shielded automatically,
 * without repeating the exclusion itself. The moment `ignores` sits next to
 * `files`/`rules` in the same object, it stops being global and only
 * narrows that one object's own match — so this object must never gain
 * another key.
 *
 * Universal ignores (house style) only — a module needing its own
 * repo-specific exclusions defines them in its own config object, once
 * that module actually has one.
 */
/** @type {import('eslint').Linter.Config} */
export const eslintConfigIgnores = {
  ignores: [
    '.eslintcache',
    '**/&*',
    '**/&*/**',
    '**/-*',
    '**/-*/**',
    '**/.temp/**',
    '**/.tmp/**',
    '**/temp/**',
    '**/tmp/**',
    'build/**/*',
    'dist/**/*',
    'node_modules/**/*',
  ],
}

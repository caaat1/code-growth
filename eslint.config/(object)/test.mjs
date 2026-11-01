// @ts-check

/**
 * The tests sit beside their entities (`src/**\/*.test.ts`), their helpers
 * in `test/`; eslintConfigBase already covers both trees, so this only
 * layers the relaxations on top.
 */
/** @type {import('eslint').Linter.Config} */
export const eslintConfigTest = {
  files: ['src/**/*.test.ts', 'test/**/*.ts'],
  rules: {
    // A test's numbers are the facts it states, not magic.
    '@typescript-eslint/no-magic-numbers': 'off',
    // Base's explicit-function-return-type config means even a trivial inline
    // predicate needs its own annotation — appropriate for src/'s module
    // boundaries, but noise across many one-line test() callbacks, where TS
    // already infers the return type and there's no API boundary to document.
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: false,
        allowDirectConstAssertionInArrowFunctions: false,
        allowConciseArrowFunctionExpressionsStartingWithVoid: false,
      },
    ],
    // `x.test.ts` is the test runner's naming, not the package's.
    'unicorn/filename-case': 'off',
  },
}

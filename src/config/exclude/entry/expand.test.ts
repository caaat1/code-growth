import assert from 'node:assert/strict'
import { test } from 'node:test'

import { expandConfigExcludeEntry } from './expand.js'

await test('expandConfigExcludeEntry also excludes the directory a bare name or dir/** names', () => {
  assert.deepEqual(expandConfigExcludeEntry('src/skip'), [
    'src/skip',
    'src/skip/**',
  ])
  assert.deepEqual(expandConfigExcludeEntry('src/skip/**'), [
    'src/skip',
    'src/skip/**',
  ])
  assert.deepEqual(expandConfigExcludeEntry('src/**/*.test.ts'), [
    'src/**/*.test.ts',
  ])
})

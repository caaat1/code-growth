import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isConfigTestPath } from './is.js'

await test('isConfigTestPath finds a test by its path or a folder holding it, with either separator', () => {
  const pattern = ['**/*.test.ts', 'src/fixture']
  assert.equal(isConfigTestPath(pattern, 'src/(kind)/a.test.ts'), true)
  assert.equal(isConfigTestPath(pattern, 'src\\(kind)\\a.test.ts'), true)
  assert.equal(isConfigTestPath(pattern, 'src/fixture'), true)
  assert.equal(isConfigTestPath(pattern, 'src/fixture/deep/b.ts'), true)
  assert.equal(isConfigTestPath(pattern, 'src\\fixture\\b.ts'), true)
  assert.equal(isConfigTestPath(pattern, 'src/fixtures/b.ts'), false)
  assert.equal(isConfigTestPath(pattern, 'src/a.ts'), false)
  assert.equal(isConfigTestPath([], 'src/a.test.ts'), false)
})

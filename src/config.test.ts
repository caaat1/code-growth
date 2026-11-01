import assert from 'node:assert/strict'
import { test } from 'node:test'

import { expandExcludeEntry, expandIncludeEntry, isTestPath } from './config.js'

await test('expandIncludeEntry expands a bare directory name to a recursive glob', () => {
  assert.equal(expandIncludeEntry('src'), 'src/**/*')
})

await test('expandIncludeEntry leaves an entry containing glob metacharacters untouched', () => {
  for (const pattern of [
    'src/**/*.ts',
    'src/*.ts',
    'src/file?.ts',
    'src/[a-z].ts',
    'src/{a,b}.ts',
  ]) {
    assert.equal(expandIncludeEntry(pattern), pattern)
  }
})

await test('expandExcludeEntry also excludes the directory a bare name or dir/** names', () => {
  assert.deepEqual(expandExcludeEntry('src/skip'), ['src/skip', 'src/skip/**'])
  assert.deepEqual(expandExcludeEntry('src/skip/**'), [
    'src/skip',
    'src/skip/**',
  ])
  assert.deepEqual(expandExcludeEntry('src/**/*.test.ts'), ['src/**/*.test.ts'])
})

await test('isTestPath finds a test by its path or a folder holding it, with either separator', () => {
  const test = ['**/*.test.ts', 'src/fixture']
  assert.equal(isTestPath(test, 'src/(xdom)/a.test.ts'), true)
  assert.equal(isTestPath(test, 'src\\(xdom)\\a.test.ts'), true)
  assert.equal(isTestPath(test, 'src/fixture'), true)
  assert.equal(isTestPath(test, 'src/fixture/deep/b.ts'), true)
  assert.equal(isTestPath(test, 'src\\fixture\\b.ts'), true)
  assert.equal(isTestPath(test, 'src/fixtures/b.ts'), false)
  assert.equal(isTestPath(test, 'src/a.ts'), false)
  assert.equal(isTestPath([], 'src/a.test.ts'), false)
})

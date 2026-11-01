import assert from 'node:assert/strict'
import { test } from 'node:test'

import { expandConfigIncludeEntry } from './expand.js'

await test('expandConfigIncludeEntry expands a bare directory name to a recursive glob', () => {
  assert.equal(expandConfigIncludeEntry('src'), 'src/**/*')
})

await test('expandConfigIncludeEntry leaves an entry containing glob metacharacters untouched', () => {
  for (const pattern of [
    'src/**/*.ts',
    'src/*.ts',
    'src/file?.ts',
    'src/[a-z].ts',
    'src/{a,b}.ts',
  ]) {
    assert.equal(expandConfigIncludeEntry(pattern), pattern)
  }
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { deriveEntityName } from './derive.js'

await test('deriveEntityName leads a function with its verb, the last word of its path', () => {
  assert.equal(
    deriveEntityName('function', 'src/total/subtract.ts'),
    'subtractTotal'
  )
})

await test('deriveEntityName gives a type PascalCase and a constant camelCase, a kind folder contributing its word', () => {
  assert.equal(
    deriveEntityName('interface', 'src/latest/md/heading.ts'),
    'LatestMdHeading'
  )
  assert.equal(
    deriveEntityName('const', 'src/latest/md/(heading)/count.ts'),
    'latestMdHeadingCount'
  )
})

await test('deriveEntityName drops a letter index', () => {
  assert.equal(deriveEntityName('type', 'src/T/total/kind.ts'), 'TotalKind')
})

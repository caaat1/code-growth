import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Snapshot } from '../../../snapshot.js'
import { createGraphEntryList } from '../../entry/list/create.js'
import { readGraphDataEntry } from '../entry/read.js'

import { findGraphDataDrift } from './find.js'

const snapshot: Snapshot = {
  total: { byte: 85945, directory: 30, line: 2049, file: 120 },
}

await test('findGraphDataDrift compares the graph data with data/, the commit aside', () => {
  const expected = createGraphEntryList([
    { filename: '2026-10-10T15-00-10.json', snapshot },
  ])
  const written = readGraphDataEntry(
    `const raw = ${JSON.stringify(
      expected.map((entry) => ({ ...entry, commit: 'abc1234 Some commit' }))
    )}\n`
  )
  assert.deepEqual(findGraphDataDrift(written, expected), [])
  assert.deepEqual(findGraphDataDrift([], expected), [
    'graph/data.js holds 0 snapshot(s), data/ 1',
  ])
  assert.deepEqual(
    findGraphDataDrift(
      [{ ...expected[0], withTest: { ...expected[0]?.withTest, lines: 11 } }],
      expected
    ),
    ['graph/data.js differs from data/ at 10/10 15:00']
  )
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Snapshot } from '../../snapshot.js'
import { createGraphEntryList } from '../entry/list/create.js'

import { findGraphDataDrift } from './drift/find.js'
import { readGraphDataEntry } from './entry/read.js'
import { generateGraphData } from './generate.js'
import { readGraphDataProject } from './project/read.js'

const snapshot: Snapshot = {
  total: { byte: 85945, directory: 30, line: 2049, file: 120 },
}

await test('generateGraphData names the project beside the graph points', () => {
  const entries = createGraphEntryList([
    { filename: '2026-10-10T15-00-10.json', snapshot },
  ])
  const source = generateGraphData(entries, 'some-project')
  assert.equal(readGraphDataProject(source), 'some-project')
  assert.deepEqual(findGraphDataDrift(readGraphDataEntry(source), entries), [])
  assert.equal(readGraphDataProject('const raw = []\n'), undefined)
})

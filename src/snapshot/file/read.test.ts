import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../../test/helper/dir/create.js'
import type { Snapshot } from '../../snapshot.js'

import { readSnapshotFile } from './read.js'

const snapshot: Snapshot = {
  total: { byte: 85945, line: 2049, file: 120 },
}

await test('readSnapshotFile returns no snapshots for a missing data dir', () => {
  assert.deepEqual(readSnapshotFile(join(createDir({}), 'data')), [])
})

await test('readSnapshotFile reads the JSON files in filename order', () => {
  const rootDir = createDir({
    '2026-09-28T10-00-00.json': JSON.stringify(snapshot),
    '2026-09-27T10-00-00.json': JSON.stringify(snapshot),
    'notes.txt': 'not a snapshot',
  })
  assert.deepEqual(
    readSnapshotFile(rootDir).map(({ filename }) => filename),
    ['2026-09-27T10-00-00.json', '2026-09-28T10-00-00.json']
  )
  assert.deepEqual(readSnapshotFile(rootDir)[0]?.snapshot, snapshot)
})

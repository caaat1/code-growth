import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createSnapshotFilename } from './create.js'
import { readSnapshotFilenameLabel } from './label/read.js'

await test('createSnapshotFilename stamps UTC seconds that readSnapshotFilenameLabel reads back', () => {
  const filename = createSnapshotFilename(new Date('2026-09-27T15:12:31.456Z'))
  assert.equal(filename, '2026-09-27T15-12-31.json')
  assert.equal(readSnapshotFilenameLabel(filename), '09/27 15:12')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { readSnapshotFilenameLabel } from './read.js'

await test('readSnapshotFilenameLabel formats an ISO-stamped filename as "MM/DD HH:MM"', () => {
  assert.equal(
    readSnapshotFilenameLabel('2026-08-07T12-42-44.json'),
    '08/07 12:42'
  )
})

await test('readSnapshotFilenameLabel keeps zero-padding from the source timestamp', () => {
  assert.equal(
    readSnapshotFilenameLabel('2026-01-05T09-03-00.json'),
    '01/05 09:03'
  )
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Snapshot } from '../../../snapshot.js'

import { createGraphEntryList } from './create.js'

const snapshot: Snapshot = {
  total: { byte: 85945, line: 2049, file: 120 },
}

const snapshotWithDirectory: Snapshot = {
  total: { ...snapshot.total, directory: 30 },
}

await test('createGraphEntryList maps each snapshot to its labelled graph point', () => {
  assert.deepEqual(
    createGraphEntryList(
      [
        { filename: '2026-09-27T15-12-31.json', snapshot },
        {
          filename: '2026-09-28T15-12-31.json',
          snapshot: snapshotWithDirectory,
        },
      ],
      new Map([['2026-09-27T15-12-31.json', 'abc1234 Add the first file']])
    ),
    [
      {
        commit: 'abc1234 Add the first file',
        t: '09/27 15:12',
        withTest: {
          bpe: null,
          bpf: 716,
          bpl: 41.9,
          bytes: 85945,
          bytesAllocated: null,
          entries: null,
          files: 120,
          lines: 2049,
          lpe: null,
          lpf: 17.1,
        },
        withoutTest: null,
      },
      {
        commit: null,
        t: '09/28 15:12',
        withTest: {
          bpe: 573,
          bpf: 716,
          bpl: 41.9,
          bytes: 85945,
          bytesAllocated: null,
          entries: 150,
          files: 120,
          lines: 2049,
          lpe: 13.7,
          lpf: 17.1,
        },
        withoutTest: null,
      },
    ]
  )
})

await test('createGraphEntryList gives a snapshot with a test tally the point without its tests', () => {
  const [entry] = createGraphEntryList([
    {
      filename: '2026-10-19T10-00-00.json',
      snapshot: {
        test: {
          byte: 945,
          byteAllocated: 8192,
          directory: 0,
          file: 20,
          line: 49,
        },
        total: {
          byte: 85945,
          byteAllocated: 491520,
          directory: 30,
          file: 120,
          line: 2049,
        },
      },
    },
  ])
  assert.deepEqual(entry?.withTest.files, 120)
  assert.deepEqual(entry?.withoutTest, {
    bpe: 654,
    bpf: 850,
    bpl: 42.5,
    bytes: 85000,
    bytesAllocated: 483328,
    entries: 130,
    files: 100,
    lines: 2000,
    lpe: 15.4,
    lpf: 20,
  })
})

await test('createGraphEntryList names a snapshot by its stored commit before the commit that added its file', () => {
  const [backfilled, live] = createGraphEntryList(
    [
      {
        filename: '2026-09-27T15-12-31.json',
        snapshot: { ...snapshot, commit: 'abc1234 Add the first file' },
      },
      { filename: '2026-09-28T15-12-31.json', snapshot },
    ],
    new Map([
      ['2026-09-27T15-12-31.json', 'fed4321 Backfill the history'],
      ['2026-09-28T15-12-31.json', 'def5678 Add the second file'],
    ])
  )
  assert.equal(backfilled?.commit, 'abc1234 Add the first file')
  assert.equal(live?.commit, 'def5678 Add the second file')
})

await test('the nominal allocation reaches the graph once measured', () => {
  const total = { ...snapshotWithDirectory.total, byteAllocated: 491520 }
  assert.equal(
    createGraphEntryList([
      { filename: '2026-09-28T15-12-31.json', snapshot: { total } },
    ])[0]?.withTest.bytesAllocated,
    total.byteAllocated
  )
})

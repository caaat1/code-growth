import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseSnapshotCommitLog } from './parse.js'

await test('parseSnapshotCommitLog pairs each snapshot file with the commit that added it, the newest addition winning', () => {
  const log = [
    '> 9a84524 Lay out latest.md like the stats page',
    '',
    'stats/general/data/2026-10-08T16-45-32.json',
    '> 75a8b0a Add the first page',
    '',
    'stats/general/data/2026-10-08T16-27-50.json',
    'stats/general/data/2026-10-08T16-45-32.json',
    '',
  ].join('\n')
  assert.deepEqual(
    [...parseSnapshotCommitLog(log)],
    [
      [
        '2026-10-08T16-45-32.json',
        '9a84524 Lay out latest.md like the stats page',
      ],
      ['2026-10-08T16-27-50.json', '75a8b0a Add the first page'],
    ]
  )
  assert.deepEqual([...parseSnapshotCommitLog('')], [])
})

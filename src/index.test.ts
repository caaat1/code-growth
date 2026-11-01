import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as codeGrowth from './index.js'

await test('the package exports its public functions and nothing else', () => {
  assert.deepEqual(Object.keys(codeGrowth).sort(), [
    'checkStats',
    'collectStats',
    'dropStats',
    'readSnapshotFile',
    'readStats',
    'renderStats',
    'runStatsPreCommit',
    'scanMeasure',
  ])
})

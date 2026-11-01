import assert from 'node:assert/strict'
import { test } from 'node:test'

import { readTotalAverage } from './read.js'

await test('readTotalAverage rounds bytes per file to whole numbers, bytes per line and line ratios to one decimal, and yields 0 for a zero divisor', () => {
  assert.deepEqual(readTotalAverage({ byte: 100, file: 3, line: 7 }), {
    byte: { per: { file: 33, line: 14.3 } },
    line: { per: { file: 2.3 } },
  })
  assert.deepEqual(readTotalAverage({ byte: 0, file: 1, line: 0 }), {
    byte: { per: { file: 0, line: 0 } },
    line: { per: { file: 0 } },
  })
})

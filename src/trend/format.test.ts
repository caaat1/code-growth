import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatTrend } from './format.js'

await test('formatTrend points up or down by the change, blank when equal or unknown', () => {
  const value = {
    high: 10,
    large: 1240,
    low: 7,
    ratioHigh: 17.1,
    ratioLow: 16.9,
  }
  assert.equal(formatTrend(value.high, value.low), '+3 ▲')
  assert.equal(formatTrend(value.low, value.high), '−3 ▼')
  assert.equal(formatTrend(value.large, 0), '+1,240 ▲')
  assert.equal(formatTrend(value.low, value.low), '')
  assert.equal(formatTrend(value.low, undefined), '')
  assert.equal(formatTrend(value.ratioHigh, value.ratioLow, 1), '+0.2 ▲')
})

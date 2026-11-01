import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseArgs } from './script.js'

await test('parseArgs runs both steps by default, one step per flag, never both flags', () => {
  assert.deepEqual(parseArgs([]), {
    check: false,
    collect: true,
    drop: [],
    render: true,
  })
  assert.deepEqual(parseArgs(['--collect-only']), {
    check: false,
    collect: true,
    drop: [],
    render: false,
  })
  assert.deepEqual(parseArgs(['--render-only']), {
    check: false,
    collect: false,
    drop: [],
    render: true,
  })
  assert.throws(
    () => parseArgs(['--collect-only', '--render-only']),
    /mutually exclusive/
  )
})

await test('parseArgs takes --check alone, which neither collects nor renders', () => {
  assert.deepEqual(parseArgs(['--check']), {
    check: true,
    collect: false,
    drop: [],
    render: false,
  })
  assert.throws(() => parseArgs(['--check', '--render-only']), /alone/)
})

await test('parseArgs takes --drop with the snapshots to drop, which renders after', () => {
  assert.deepEqual(parseArgs(['--drop', 'a.json', 'b.json']), {
    check: false,
    collect: false,
    drop: ['a.json', 'b.json'],
    render: true,
  })
  assert.throws(() => parseArgs(['--drop']), /names the snapshots/)
  assert.throws(() => parseArgs(['--check', '--drop', 'a.json']), /alone/)
})

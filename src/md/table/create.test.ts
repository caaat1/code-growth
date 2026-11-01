import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createMdTable } from './create.js'

await test('createMdTable right-pads a left column and left-pads (with a trailing colon marker) a right column', () => {
  const table = createMdTable(
    ['unit', 'count'],
    ['left', 'right'],
    [
      ['byte', '85,945'],
      ['line', '2,049'],
    ]
  )
  assert.equal(
    table,
    [
      '| unit |  count |',
      '| ---- | -----: |',
      '| byte | 85,945 |',
      '| line |  2,049 |',
    ].join('\n')
  )
})

await test('createMdTable widens a column to fit its header when every row value is shorter', () => {
  const table = createMdTable(
    ['per', 'value'],
    ['left', 'right'],
    [['file', '17']]
  )
  assert.equal(
    table,
    ['| per  | value |', '| ---- | ----: |', '| file |    17 |'].join('\n')
  )
})

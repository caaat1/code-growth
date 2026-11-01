import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Snapshot } from '../../snapshot.js'

import { renderLatestMd } from './render.js'

const snapshot: Snapshot = {
  total: { byte: 85945, line: 2049, file: 120 },
}

const snapshotWithDirectory: Snapshot = {
  total: { ...snapshot.total, directory: 30 },
}

const snapshotWithTest: Snapshot = {
  test: { byte: 945, byteAllocated: 8192, directory: 0, file: 20, line: 49 },
  total: {
    byte: 85945,
    byteAllocated: 491520,
    directory: 30,
    file: 120,
    line: 2049,
  },
}

// The cells of the table under a heading of latest.md, header first, the
// alignment row left out.
function readMdTableCell(md: string, heading: string): string[][] {
  const block = md.split('\n\n')
  return (block.at(block.indexOf(heading) + 1) ?? '')
    .split('\n')
    .filter((row, index) => row !== '' && index !== 1)
    .map((row) =>
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    )
}

await test('renderLatestMd lays out one table per chart pane', () => {
  assert.equal(
    renderLatestMd(snapshot),
    [
      '# xDom stat',
      '## files · entries · lines · bytes',
      '| unit |  count |\n| ---- | -----: |\n| byte | 85,945 |\n| line |  2,049 |\n| file |    120 |',
      '## bytes / file',
      '| ratio       | value |\n| ----------- | ----: |\n| byte / file |   716 |',
      '## lines / file',
      '| ratio       | value |\n| ----------- | ----: |\n| line / file |  17.1 |',
      '## bytes / line',
      '| ratio       | value |\n| ----------- | ----: |\n| byte / line |  41.9 |',
    ].join('\n\n') + '\n'
  )
})

await test('renderLatestMd keeps the decimal of a whole line ratio', () => {
  assert.ok(
    renderLatestMd({ total: { byte: 1, file: 120, line: 2040 } }).includes(
      '| line / file |  17.0 |\n'
    )
  )
})

await test('renderLatestMd adds a trend column against the previous snapshot', () => {
  assert.equal(
    renderLatestMd(snapshotWithDirectory, {
      total: { byte: 85000, file: 121, line: 2049 },
    }),
    [
      '# xDom stat',
      '## files · entries · lines · bytes',
      '| unit  |  count |  trend |\n| ----- | -----: | -----: |\n| byte  | 85,945 | +945 ▲ |\n| line  |  2,049 |        |\n| file  |    120 |   −1 ▼ |\n| entry |    150 |        |',
      '## bytes / file',
      '| ratio        | value | trend |\n| ------------ | ----: | ----: |\n| byte / file  |   716 | +14 ▲ |\n| byte / entry |   573 |       |',
      '## lines / file',
      '| ratio        | value |  trend |\n| ------------ | ----: | -----: |\n| line / file  |  17.1 | +0.2 ▲ |\n| line / entry |  13.7 |        |',
      '## bytes / line',
      '| ratio       | value |  trend |\n| ----------- | ----: | -----: |\n| byte / line |  41.9 | +0.4 ▲ |',
    ].join('\n\n') + '\n'
  )
})

await test('renderLatestMd adds the entry count and per-entry ratios once directories are counted', () => {
  const rendered = renderLatestMd(snapshotWithDirectory)
  const total = rendered.split('## bytes / file')[0] ?? ''
  assert.ok(total.includes('| file  |    120 |'))
  assert.ok(total.includes('| entry |    150 |'))
  assert.ok(rendered.includes('| byte / entry |   573 |'))
  assert.ok(rendered.includes('| line / entry |  13.7 |'))
  assert.equal(renderLatestMd(snapshot).includes('entry'), false)
})

await test('renderLatestMd sets the tally without tests beside the full one, each with its trend', () => {
  const rendered = renderLatestMd(snapshotWithTest, {
    test: { byte: 900, byteAllocated: 8192, directory: 0, file: 19, line: 40 },
    total: {
      byte: 85000,
      byteAllocated: 487424,
      directory: 30,
      file: 118,
      line: 2000,
    },
  })
  assert.deepEqual(
    readMdTableCell(rendered, '## files · entries · lines · bytes'),
    [
      ['unit', 'with tests', 'trend', 'without tests', 'trend'],
      ['byte', '85,945', '+945 ▲', '85,000', '+900 ▲'],
      [
        'byte allocated (nominal 4 KiB)',
        '491,520',
        '+4,096 ▲',
        '483,328',
        '+4,096 ▲',
      ],
      ['line', '2,049', '+49 ▲', '2,000', '+40 ▲'],
      ['file', '120', '+2 ▲', '100', '+1 ▲'],
      ['entry', '150', '+2 ▲', '130', '+1 ▲'],
    ]
  )
  assert.deepEqual(readMdTableCell(rendered, '## bytes / line'), [
    ['ratio', 'with tests', 'trend', 'without tests', 'trend'],
    ['byte / line', '41.9', '−0.6 ▼', '42.5', '−0.4 ▼'],
  ])
})

await test('renderLatestMd leaves the trend without tests blank after a snapshot without a test tally, and has no trends without a previous snapshot', () => {
  const rendered = renderLatestMd(snapshotWithTest, {
    total: {
      byte: 85000,
      byteAllocated: 487424,
      directory: 30,
      file: 118,
      line: 2000,
    },
  })
  assert.deepEqual(
    readMdTableCell(rendered, '## files · entries · lines · bytes').at(1),
    ['byte', '85,945', '+945 ▲', '85,000', '']
  )
  assert.deepEqual(
    readMdTableCell(renderLatestMd(snapshotWithTest), '## bytes / file'),
    [
      ['ratio', 'with tests', 'without tests'],
      ['byte / file', '716', '850'],
      ['byte / entry', '573', '654'],
    ]
  )
})

await test('renderLatestMd keeps a row whose count the test tally lacks, its cells without tests blank', () => {
  const rendered = renderLatestMd({
    test: { byte: 945, file: 20, line: 49 },
    total: snapshotWithTest.total,
  })
  assert.deepEqual(
    readMdTableCell(rendered, '## files · entries · lines · bytes').slice(2),
    [
      ['byte allocated (nominal 4 KiB)', '491,520', ''],
      ['line', '2,049', '2,000'],
      ['file', '120', '100'],
      ['entry', '150', ''],
    ]
  )
})

await test('the nominal allocation reaches latest.md once measured', () => {
  const total = { ...snapshotWithDirectory.total, byteAllocated: 491520 }
  assert.ok(
    renderLatestMd({ total }).includes(
      '| byte allocated (nominal 4 KiB) | 491,520 |'
    )
  )
  assert.equal(renderLatestMd(snapshot).includes('allocated'), false)
})

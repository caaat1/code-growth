import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../test/helper/dir/create.js'

import {
  average,
  collect,
  createMdTable,
  dropSnapshots,
  formatTrend,
  generateGraphData,
  graphEntries,
  findGraphDataDrift,
  parseArgs,
  parseSnapshotCommitLog,
  readGraphDataEntries,
  readGraphDataProject,
  readSnapshots,
  renderLatestMd,
  scan,
  scanByteOnDisk,
  snapshotFilename,
  snapshotLabel,
  subtractTotal,
} from './script.js'
import type { Snapshot } from './script.js'

const snapshot: Snapshot = {
  total: { byte: 85945, line: 2049, file: 120 },
}

const snapshotWithDirectory: Snapshot = {
  total: { ...snapshot.total, directory: 30 },
}

await test('snapshotLabel formats an ISO-stamped filename as "MM/DD HH:MM"', () => {
  assert.equal(snapshotLabel('2026-08-07T12-42-44.json'), '08/07 12:42')
})

await test('snapshotLabel keeps zero-padding from the source timestamp', () => {
  assert.equal(snapshotLabel('2026-01-05T09-03-00.json'), '01/05 09:03')
})

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

await test('scan counts bytes, newlines, files and directories, skipping dotfiles and exclusions', () => {
  const rootDir = createDir({
    'other/c.ts': 'ignored\n',
    'src/.hidden/d.ts': 'hidden\n',
    'src/.e.yml': 'dotfile\n',
    'src/a.ts': 'x\ny\n',
    'src/skip/f.ts': 'excluded\n',
    'src/sub/b.ts': 'zé\n',
  })
  assert.deepEqual(
    scan({ exclude: ['src/skip/**'], include: ['src'] }, rootDir).total,
    { byte: 8, byteAllocated: 8192, directory: 1, file: 2, line: 3 }
  )
})

await test('scan tallies the tests apart and keeps them in the total, a test folder with its contents', () => {
  const rootDir = createDir({
    'src/a.test.ts': 'x\n',
    'src/a.ts': 'x\ny\n',
    'src/fixture/b.ts': 'x\ny\nz\n',
    'src/fixtures/c.ts': 'x\n',
  })
  assert.deepEqual(
    scan({ include: ['src'], test: ['**/*.test.ts', 'src/fixture'] }, rootDir),
    {
      test: { byte: 8, byteAllocated: 8192, directory: 1, file: 2, line: 4 },
      total: {
        byte: 14,
        byteAllocated: 16384,
        directory: 2,
        file: 4,
        line: 7,
      },
    }
  )
  assert.deepEqual(scan({ include: ['src'] }, rootDir).test, {
    byte: 0,
    byteAllocated: 0,
    directory: 0,
    file: 0,
    line: 0,
  })
})

await test('subtractTotal takes a part out of a total, a count either lacks staying unknown', () => {
  assert.deepEqual(
    subtractTotal(
      { byte: 14, byteAllocated: 16384, directory: 2, file: 4, line: 7 },
      { byte: 8, byteAllocated: 8192, directory: 1, file: 2, line: 4 }
    ),
    { byte: 6, byteAllocated: 8192, directory: 1, file: 2, line: 3 }
  )
  assert.deepEqual(
    subtractTotal(
      { byte: 14, directory: 2, file: 4, line: 7 },
      { byte: 8, byteAllocated: 8192, file: 2, line: 4 }
    ),
    { byte: 6, file: 2, line: 3 }
  )
})

await test('scan allocates each file whole 4 KiB units, an empty file none', () => {
  const size = { unit: 4096 }
  const rootDir = createDir({
    'src/empty.ts': '',
    'src/exact.ts': 'x'.repeat(size.unit),
    'src/over.ts': 'x'.repeat(size.unit + 1),
  })
  assert.deepEqual(scan({ include: ['src'] }, rootDir).total, {
    byte: 8193,
    byteAllocated: 12288,
    directory: 0,
    file: 3,
    line: 0,
  })
})

await test('scanByteOnDisk sums the blocks the files really take, in whole 512-byte units', () => {
  const size = { block: 512, noise: 65536 }
  const rootDir = createDir({})
  mkdirSync(join(rootDir, 'src'))
  writeFileSync(join(rootDir, 'src', 'noise.bin'), randomBytes(size.noise))
  const byteOnDisk = scanByteOnDisk({ include: ['src'] }, rootDir)
  assert.equal(byteOnDisk % size.block, 0)
  assert.ok(byteOnDisk >= size.noise, String(byteOnDisk))
})

await test('average rounds bytes per file to whole numbers, bytes per line and line ratios to one decimal, and yields 0 for a zero divisor', () => {
  assert.deepEqual(average({ byte: 100, file: 3, line: 7 }), {
    byte: { per: { file: 33, line: 14.3 } },
    line: { per: { file: 2.3 } },
  })
  assert.deepEqual(average({ byte: 0, file: 1, line: 0 }), {
    byte: { per: { file: 0, line: 0 } },
    line: { per: { file: 0 } },
  })
})

await test('snapshotFilename stamps UTC seconds that snapshotLabel reads back', () => {
  const filename = snapshotFilename(new Date('2026-09-27T15:12:31.456Z'))
  assert.equal(filename, '2026-09-27T15-12-31.json')
  assert.equal(snapshotLabel(filename), '09/27 15:12')
})

await test('collect writes the snapshot it returns, its tallies only, into a data dir it creates', () => {
  const rootDir = createDir({ 'src/a.test.ts': 'x\n', 'src/a.ts': 'x\ny\n' })
  const dataDir = join(rootDir, 'data')
  const snap = collect(
    { include: ['src'], test: ['**/*.test.ts'] },
    rootDir,
    dataDir,
    new Date('2026-09-27T15:12:31Z')
  )
  assert.deepEqual(snap, {
    test: { byte: 2, byteAllocated: 4096, directory: 0, file: 1, line: 1 },
    total: { byte: 6, byteAllocated: 8192, directory: 0, file: 2, line: 3 },
  })
  const written: unknown = JSON.parse(
    readFileSync(join(dataDir, '2026-09-27T15-12-31.json'), 'utf-8')
  )
  assert.deepEqual(written, snap)
  assert.deepEqual(Object.keys(written as object), ['test', 'total'])
})

await test('collect refuses a config that matches no files', () => {
  const rootDir = createDir({ 'src/a.ts': 'x\n' })
  assert.throws(
    () =>
      collect(
        { include: ['missing'] },
        rootDir,
        join(rootDir, 'data'),
        new Date()
      ),
    /No files match include \["missing"\]/
  )
})

await test('readSnapshots returns no snapshots for a missing data dir', () => {
  assert.deepEqual(readSnapshots(join(createDir({}), 'data')), [])
})

await test('readSnapshots reads the JSON files in filename order', () => {
  const rootDir = createDir({
    '2026-09-28T10-00-00.json': JSON.stringify(snapshot),
    '2026-09-27T10-00-00.json': JSON.stringify(snapshot),
    'notes.txt': 'not a snapshot',
  })
  assert.deepEqual(
    readSnapshots(rootDir).map(({ filename }) => filename),
    ['2026-09-27T10-00-00.json', '2026-09-28T10-00-00.json']
  )
  assert.deepEqual(readSnapshots(rootDir)[0]?.snap, snapshot)
})

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

await test('parseSnapshotCommitLog pairs each snapshot file with the commit that added it, the newest addition winning', () => {
  const log = [
    '> 9a84524 Lay out latest.md like the stats page',
    '',
    'stats/general/data/2026-10-08T16-45-32.json',
    '> 75a8b0a Reject an append item on a blueprint without the parent role',
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
      [
        '2026-10-08T16-27-50.json',
        '75a8b0a Reject an append item on a blueprint without the parent role',
      ],
    ]
  )
  assert.deepEqual([...parseSnapshotCommitLog('')], [])
})

await test('graphEntries maps each snapshot to its labelled graph point', () => {
  assert.deepEqual(
    graphEntries(
      [
        { filename: '2026-09-27T15-12-31.json', snap: snapshot },
        { filename: '2026-09-28T15-12-31.json', snap: snapshotWithDirectory },
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

await test('graphEntries gives a snapshot with a test tally the point without its tests', () => {
  const [entry] = graphEntries([
    {
      filename: '2026-10-19T10-00-00.json',
      snap: {
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

await test('graphEntries names a snapshot by its stored commit before the commit that added its file', () => {
  const [backfilled, live] = graphEntries(
    [
      {
        filename: '2026-09-27T15-12-31.json',
        snap: { ...snapshot, commit: 'abc1234 Add the first file' },
      },
      { filename: '2026-09-28T15-12-31.json', snap: snapshot },
    ],
    new Map([
      ['2026-09-27T15-12-31.json', 'fed4321 Backfill the history'],
      ['2026-09-28T15-12-31.json', 'def5678 Add the second file'],
    ])
  )
  assert.equal(backfilled?.commit, 'abc1234 Add the first file')
  assert.equal(live?.commit, 'def5678 Add the second file')
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

await test('dropSnapshots recycles the named snapshots of data/ and refuses unknown ones', () => {
  const rootDir = createDir({
    'data/2026-10-06T15-34-17.json': '{}',
    'data/2026-10-07T09-00-00.json': '{}',
  })
  const dataDir = join(rootDir, 'data')
  const recycled: string[] = []
  const recycle = (path: string): void => {
    recycled.push(path)
  }
  assert.deepEqual(
    dropSnapshots({
      dataDir,
      name: ['stats/general/data/2026-10-06T15-34-17.json'],
      recycle,
    }),
    [join(dataDir, '2026-10-06T15-34-17.json')]
  )
  assert.deepEqual(recycled, [join(dataDir, '2026-10-06T15-34-17.json')])
  assert.throws(
    () =>
      dropSnapshots({ dataDir, name: ['2026-01-01T00-00-00.json'], recycle }),
    /No such snapshot/
  )
  assert.equal(recycled.length, 1)
})

await test('findGraphDataDrift compares the graph data with data/, the commit aside', () => {
  const expected = graphEntries([
    { filename: '2026-10-10T15-00-10.json', snap: snapshotWithDirectory },
  ])
  const written = readGraphDataEntries(
    `const raw = ${JSON.stringify(
      expected.map((entry) => ({ ...entry, commit: 'abc1234 Some commit' }))
    )}\n`
  )
  assert.deepEqual(findGraphDataDrift(written, expected), [])
  assert.deepEqual(findGraphDataDrift([], expected), [
    'graph/data.js holds 0 snapshot(s), data/ 1',
  ])
  assert.deepEqual(
    findGraphDataDrift(
      [{ ...expected[0], withTest: { ...expected[0]?.withTest, lines: 11 } }],
      expected
    ),
    ['graph/data.js differs from data/ at 10/10 15:00']
  )
})

await test('generateGraphData names the project beside the graph points', () => {
  const entries = graphEntries([
    { filename: '2026-10-10T15-00-10.json', snap: snapshotWithDirectory },
  ])
  const source = generateGraphData(entries, 'indi-loom')
  assert.equal(readGraphDataProject(source), 'indi-loom')
  assert.deepEqual(
    findGraphDataDrift(readGraphDataEntries(source), entries),
    []
  )
  assert.equal(readGraphDataProject('const raw = []\n'), undefined)
})

await test('the nominal allocation reaches latest.md and the graph once measured', () => {
  const total = { ...snapshotWithDirectory.total, byteAllocated: 491520 }
  assert.ok(
    renderLatestMd({ total }).includes(
      '| byte allocated (nominal 4 KiB) | 491,520 |'
    )
  )
  assert.equal(renderLatestMd(snapshot).includes('allocated'), false)
  assert.equal(
    graphEntries([{ filename: '2026-09-28T15-12-31.json', snap: { total } }])[0]
      ?.withTest.bytesAllocated,
    total.byteAllocated
  )
})

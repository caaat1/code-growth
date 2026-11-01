import { execFileSync } from 'node:child_process'
import {
  existsSync,
  globSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

import { format, resolveConfig } from 'prettier'

import {
  expandExcludeEntry,
  expandIncludeEntry,
  isTestPath,
  statsConfig,
} from './config.js'
import type { StatsConfig } from './config.js'
import { findProjectRootDir } from './project/root/dir/find.js'

export interface Total {
  byte: number
  byteAllocated?: number
  directory?: number
  file: number
  line: number
}

export interface Average {
  byte: { per: { file: number; line: number } }
  line: { per: { file: number } }
}

// What a scan measures: every entry it reaches, and the tests among them,
// counted in the total and again on their own.
export interface Measure {
  test: Total
  total: Total
}

export interface Snapshot {
  // The commit the snapshot measured, stored only when it is known at
  // collection (a backfill from git history); otherwise render asks git
  // which commit added the snapshot file.
  commit?: string
  // Absent from a snapshot taken before the tests were tallied apart.
  test?: Total
  total: Total
}

export interface SnapshotFile {
  filename: string
  snap: Snapshot
}

// The values a graph point shows for one tally: the tests in it or left
// out of it.
export interface GraphTally {
  bpe: number | null
  bpf: number
  bpl: number
  bytes: number
  bytesAllocated: number | null
  entries: number | null
  files: number
  lines: number
  lpe: number | null
  lpf: number
}

export interface GraphEntry {
  commit: string | null
  t: string
  withTest: GraphTally
  // null for a snapshot that holds no tally of its tests.
  withoutTest: GraphTally | null
}

export function snapshotLabel(filename: string): string {
  const base = filename.slice(0, -'.json'.length)
  const ti = base.indexOf('T')
  const [, month, day] = base.slice(0, ti).split('-')
  const [hour, minute] = base.slice(ti + 1).split('-')
  return `${month}/${day} ${hour}:${minute}`
}

// Indentation doesn't matter: render() immediately runs this back through
// Prettier (see its own comment on why), so the exact width JSON.stringify
// happens to use here is fully discarded either way. The project's folder
// name titles the page, so the pages of several projects open side by
// side tell apart.
export function generateGraphData(
  entries: readonly GraphEntry[],
  project: string
): string {
  return `const project = ${JSON.stringify(project)}\nconst raw = ${JSON.stringify(entries)}\n`
}

export function readGraphDataEntries(source: string): unknown[] {
  return runInNewContext(`${source}\nraw`) as unknown[]
}

export function readGraphDataProject(source: string): unknown {
  return runInNewContext(
    `${source}\ntypeof project === 'undefined' ? undefined : project`
  )
}

function stringifyWithoutCommit(entry: unknown): string {
  const { commit: _commit, ...rest } = entry as Record<string, unknown>
  return JSON.stringify(rest)
}

export function findGraphDataDrift(
  written: readonly unknown[],
  expected: readonly GraphEntry[]
): string[] {
  if (written.length !== expected.length) {
    return [
      `graph/data.js holds ${written.length} snapshot(s), data/ ${expected.length}`,
    ]
  }
  return expected.flatMap((entry, index): string[] =>
    stringifyWithoutCommit(written.at(index)) === stringifyWithoutCommit(entry)
      ? []
      : [`graph/data.js differs from data/ at ${entry.t}`]
  )
}

const RATIO_DECIMALS = { byte: 0, bytePerLine: 1, line: 1 } as const
const ALLOCATION_UNIT = 4096
const STAT_BLOCK = 512
const DECIMAL_BASE = 10

const fmt = (n: number, decimals = 0): string =>
  n.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })

export function createMdTable(
  headers: string[],
  alignments: ('left' | 'right')[],
  rows: string[][]
): string {
  const cols = headers.map((h, i): { right: boolean; width: number } => ({
    // eslint-disable-next-line security/detect-object-injection -- i is this same map's own loop index, not attacker input
    right: alignments[i] === 'right',
    width: Math.max(
      h.length,
      // eslint-disable-next-line security/detect-object-injection -- i is this same map's own loop index, not attacker input
      ...rows.map((r): number => r[i]?.length ?? 0)
    ),
  }))
  const fmtRow = (cells: string[]): string =>
    '| ' +
    cols
      .map((col, i): string => {
        // eslint-disable-next-line security/detect-object-injection -- i is this same map's own loop index, not attacker input
        const cell = cells[i] ?? ''
        return col.right ? cell.padStart(col.width) : cell.padEnd(col.width)
      })
      .join(' | ') +
    ' |'
  const sepRow =
    '| ' +
    cols
      .map((col): string =>
        col.right ? '-'.repeat(col.width - 1) + ':' : '-'.repeat(col.width)
      )
      .join(' | ') +
    ' |'
  return [fmtRow(headers), sepRow, ...rows.map(fmtRow)].join('\n')
}

// script.ts lives inside its own tool's asset folder now (stats/general/),
// so that folder *is* import.meta.dirname — no more deriving a sibling
// asset dir from the script's own filename stem.
const BASE_DIR = import.meta.dirname
const DATA_DIR = join(BASE_DIR, 'data')
const GRAPH_DIR = join(BASE_DIR, 'graph')
const GRAPH_DATA_JS = join(GRAPH_DIR, 'data.js')
const LATEST_MD = join(BASE_DIR, 'latest.md')
const GRAPH_HTML = join(BASE_DIR, 'graph.html')
// Marker-based (nearest ancestor package.json) rather than a hand-counted
// '..', '..' — stable regardless of the invoker's cwd *and* of how deep
// this tool's own folder sits under the project root.
const PROJECT_ROOT = findProjectRootDir(BASE_DIR)

function createTotal(): Required<Total> {
  return { byte: 0, byteAllocated: 0, directory: 0, file: 0, line: 0 }
}

// Dotfiles/dot-directories are skipped without needing to say so: it's
// fs.globSync's own default `**` behavior (verified empirically), the same
// outcome the previous hand-rolled recursive readdirSync walk got from its
// explicit `entry.name.startsWith('.')` check.
export function scan(config: StatsConfig, rootDir: string): Measure {
  const entries = globSync(config.include.map(expandIncludeEntry), {
    cwd: rootDir,
    exclude: (config.exclude ?? []).flatMap(expandExcludeEntry),
    withFileTypes: true,
  })
  const total = createTotal()
  const test = createTotal()
  for (const entry of entries) {
    const path = join(entry.parentPath, entry.name)
    const tally = isTestPath(config.test ?? [], relative(rootDir, path))
      ? [total, test]
      : [total]
    if (entry.isDirectory()) {
      for (const each of tally) {
        each.directory += 1
      }
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    const content = readFileSync(path)
    const line = content.toString().split('\n').length - 1
    for (const each of tally) {
      each.byte += content.byteLength
      each.byteAllocated +=
        Math.ceil(content.byteLength / ALLOCATION_UNIT) * ALLOCATION_UNIT
      each.line += line
      each.file += 1
    }
  }
  return { test, total }
}

function subtractCount(
  count: number | undefined,
  part: number | undefined
): number | undefined {
  return count === undefined || part === undefined ? undefined : count - part
}

// The total left once a part of it is taken out; a count either one lacks
// stays unknown.
export function subtractTotal(total: Total, part: Total): Total {
  const byteAllocated = subtractCount(total.byteAllocated, part.byteAllocated)
  const directory = subtractCount(total.directory, part.directory)
  return {
    byte: total.byte - part.byte,
    ...(byteAllocated === undefined ? {} : { byteAllocated }),
    ...(directory === undefined ? {} : { directory }),
    file: total.file - part.file,
    line: total.line - part.line,
  }
}

export function scanByteOnDisk(config: StatsConfig, rootDir: string): number {
  return globSync(config.include.map(expandIncludeEntry), {
    cwd: rootDir,
    exclude: (config.exclude ?? []).flatMap(expandExcludeEntry),
    withFileTypes: true,
  })
    .filter((entry): boolean => entry.isFile())
    .reduce(
      (sum, entry): number =>
        sum + statSync(join(entry.parentPath, entry.name)).blocks * STAT_BLOCK,
      0
    )
}

function divide(dividend: number, divisor: number, decimals: number): number {
  if (divisor === 0) {
    return 0
  }
  const factor = DECIMAL_BASE ** decimals
  return Math.round((dividend * factor) / divisor) / factor
}

export function average(total: Total): Average {
  return {
    byte: {
      per: {
        line: divide(total.byte, total.line, RATIO_DECIMALS.bytePerLine),
        file: divide(total.byte, total.file, RATIO_DECIMALS.byte),
      },
    },
    line: {
      per: {
        file: divide(total.line, total.file, RATIO_DECIMALS.line),
      },
    },
  }
}

// Drops the milliseconds + 'Z' toISOString() appends, leaving exactly
// 'YYYY-MM-DDTHH:mm:ss' — computed from that literal rather than a bare
// 19, so the slice length stays visibly tied to what it's actually
// keeping.
export function snapshotFilename(date: Date): string {
  const isoSecondsLength = 'YYYY-MM-DDTHH:mm:ss'.length
  return `${date.toISOString().slice(0, isoSecondsLength).replaceAll(':', '-')}.json`
}

// Writes one new timestamped snapshot into data/ from a fresh scan of src/.
// Pure data collection — never touches latest.md or the graph, so it never
// needs to know how those are presented, and running it back-to-back is
// just "add another data point."
export function collect(
  config: StatsConfig,
  rootDir: string,
  dataDir: string,
  date: Date
): Measure {
  const snap = scan(config, rootDir)
  if (snap.total.file === 0) {
    throw new Error(
      `No files match include ${JSON.stringify(config.include)} under ${rootDir} — check stats/general/config.ts.`
    )
  }
  mkdirSync(dataDir, { recursive: true })
  const PRETTY_PRINT_INDENT = 2 // human-reviewable snapshot file, unlike graph/data.js this is never reformatted afterward
  writeFileSync(
    join(dataDir, snapshotFilename(date)),
    JSON.stringify(snap, null, PRETTY_PRINT_INDENT) + '\n'
  )
  return snap
}

function report({ test, total }: Measure, byteOnDisk: number): void {
  const { byte, line } = average(total)
  console.info(`xDom stat`)
  console.info(
    `total
    byte ${fmt(total.byte)},
    byte allocated (nominal 4 KiB) ${fmt(total.byteAllocated ?? 0)},
    byte on this disk ${fmt(byteOnDisk)} (this checkout only, never stored),
    line ${fmt(total.line)},
    file ${fmt(total.file)},
    entry ${fmt(total.file + (total.directory ?? 0))}`
  )
  console.info(
    `of which tests
    byte ${fmt(test.byte)},
    line ${fmt(test.line)},
    file ${fmt(test.file)},
    entry ${fmt(test.file + (test.directory ?? 0))}`
  )
  console.info(
    `average
    byte/line ${fmt(byte.per.line, RATIO_DECIMALS.bytePerLine)},
    byte/file ${fmt(byte.per.file, RATIO_DECIMALS.byte)},
    line/file ${fmt(line.per.file, RATIO_DECIMALS.line)}`
  )
}

export function readSnapshots(dataDir: string): SnapshotFile[] {
  let filenames: string[]
  try {
    filenames = readdirSync(dataDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
  return filenames
    .filter((f): boolean => f.endsWith('.json'))
    .sort()
    .map((filename): SnapshotFile => ({
      filename,
      snap: JSON.parse(
        readFileSync(join(dataDir, filename), 'utf-8')
      ) as Snapshot,
    }))
}

const TREND = {
  down: { arrow: '▼', sign: '−' },
  up: { arrow: '▲', sign: '+' },
} as const

export function formatTrend(
  current: number,
  previous: number | undefined,
  decimals = 0
): string {
  if (previous === undefined || current === previous) {
    return ''
  }
  const { arrow, sign } = current > previous ? TREND.up : TREND.down
  return `${sign}${fmt(Math.abs(current - previous), decimals)} ${arrow}`
}

function entryOf(total: Total): number | undefined {
  return total.directory === undefined
    ? undefined
    : total.file + total.directory
}

// One tally latest.md shows: the newest total and the one before it, for
// the trend, under a column heading of its own once there are two.
interface LatestTally {
  current: Total
  heading?: string
  previous: Total | undefined
}

// A row of a latest.md table; a value no tally knows drops the row.
interface LatestRow {
  decimals: number
  label: string
  read: (total: Total) => number | undefined
}

interface LatestHeading {
  label: string
  value: string
}

const LATEST_HEADING_COUNT: LatestHeading = { label: 'unit', value: 'count' }
const LATEST_HEADING_RATIO: LatestHeading = { label: 'ratio', value: 'value' }

function readPerEntry(
  dividend: 'byte' | 'line',
  decimals: number
): (total: Total) => number | undefined {
  return (total): number | undefined => {
    const entries = entryOf(total)
    return entries === undefined
      ? undefined
      : divide(dividend === 'byte' ? total.byte : total.line, entries, decimals)
  }
}

const LATEST_ROW_COUNT: readonly LatestRow[] = [
  { decimals: 0, label: 'byte', read: (total): number => total.byte },
  {
    decimals: 0,
    label: 'byte allocated (nominal 4 KiB)',
    read: (total): number | undefined => total.byteAllocated,
  },
  { decimals: 0, label: 'line', read: (total): number => total.line },
  { decimals: 0, label: 'file', read: (total): number => total.file },
  { decimals: 0, label: 'entry', read: entryOf },
]
const LATEST_ROW_BYTE_PER_FILE: readonly LatestRow[] = [
  {
    decimals: RATIO_DECIMALS.byte,
    label: 'byte / file',
    read: (total): number => average(total).byte.per.file,
  },
  {
    decimals: RATIO_DECIMALS.byte,
    label: 'byte / entry',
    read: readPerEntry('byte', RATIO_DECIMALS.byte),
  },
]
const LATEST_ROW_LINE_PER_FILE: readonly LatestRow[] = [
  {
    decimals: RATIO_DECIMALS.line,
    label: 'line / file',
    read: (total): number => average(total).line.per.file,
  },
  {
    decimals: RATIO_DECIMALS.line,
    label: 'line / entry',
    read: readPerEntry('line', RATIO_DECIMALS.line),
  },
]
const LATEST_ROW_BYTE_PER_LINE: readonly LatestRow[] = [
  {
    decimals: RATIO_DECIMALS.bytePerLine,
    label: 'byte / line',
    read: (total): number => average(total).byte.per.line,
  },
]

// Every file, and once the newest snapshot holds a test tally, the files
// without the tests beside them; a previous snapshot without one leaves
// that tally's trend blank.
function readLatestTally(
  last: Snapshot,
  previous: Snapshot | undefined
): LatestTally[] {
  if (last.test === undefined) {
    return [{ current: last.total, previous: previous?.total }]
  }
  return [
    { current: last.total, heading: 'with tests', previous: previous?.total },
    {
      current: subtractTotal(last.total, last.test),
      heading: 'without tests',
      previous:
        previous?.test === undefined
          ? undefined
          : subtractTotal(previous.total, previous.test),
    },
  ]
}

function createLatestTable(
  heading: LatestHeading,
  row: readonly LatestRow[],
  tally: readonly LatestTally[],
  hasTrend: boolean
): string {
  const header = [
    heading.label,
    ...tally.flatMap((each): string[] => {
      const value = each.heading ?? heading.value
      return hasTrend ? [value, 'trend'] : [value]
    }),
  ]
  const body = row.flatMap(({ decimals, label, read }): string[][] => {
    const value = tally.map(({ current }): number | undefined => read(current))
    if (value.every((each): boolean => each === undefined)) {
      return []
    }
    return [
      [
        label,
        ...tally.flatMap((each, index): string[] => {
          const current = value.at(index)
          const cell = current === undefined ? '' : fmt(current, decimals)
          if (!hasTrend) {
            return [cell]
          }
          const before =
            each.previous === undefined ? undefined : read(each.previous)
          return [
            cell,
            current === undefined ? '' : formatTrend(current, before, decimals),
          ]
        }),
      ],
    ]
  })
  return createMdTable(
    header,
    header.map((_, index): 'left' | 'right' =>
      index === 0 ? 'left' : 'right'
    ),
    body
  )
}

export function renderLatestMd(last: Snapshot, previous?: Snapshot): string {
  const tally = readLatestTally(last, previous)
  const table = (heading: LatestHeading, row: readonly LatestRow[]): string =>
    createLatestTable(heading, row, tally, previous !== undefined)
  return (
    [
      '# xDom stat',
      '## files · entries · lines · bytes',
      table(LATEST_HEADING_COUNT, LATEST_ROW_COUNT),
      '## bytes / file',
      table(LATEST_HEADING_RATIO, LATEST_ROW_BYTE_PER_FILE),
      '## lines / file',
      table(LATEST_HEADING_RATIO, LATEST_ROW_LINE_PER_FILE),
      '## bytes / line',
      table(LATEST_HEADING_RATIO, LATEST_ROW_BYTE_PER_LINE),
    ].join('\n\n') + '\n'
  )
}

const SNAPSHOT_COMMIT_MARKER = '> '

// Pairs each snapshot file with the commit that added it: the pre-commit
// hook stages a snapshot into the very commit whose src/ changes it
// measured, so that commit's subject explains the step in the curves.
// git log lists the newest commit first, so a file added more than once
// keeps its latest addition.
export function parseSnapshotCommitLog(log: string): Map<string, string> {
  const commitByFilename = new Map<string, string>()
  let commit: string | undefined
  for (const line of log.split('\n')) {
    if (line.startsWith(SNAPSHOT_COMMIT_MARKER)) {
      commit = line.slice(SNAPSHOT_COMMIT_MARKER.length).trim()
      continue
    }
    const filename = line.trim().split('/').at(-1) ?? ''
    if (
      commit !== undefined &&
      filename.endsWith('.json') &&
      !commitByFilename.has(filename)
    ) {
      commitByFilename.set(filename, commit)
    }
  }
  return commitByFilename
}

// Read-only, and never fatal: outside a git checkout every point simply
// has no commit.
function readSnapshotCommit(): Map<string, string> {
  try {
    return parseSnapshotCommitLog(
      execFileSync(
        'git',
        [
          'log',
          '--diff-filter=A',
          '--name-only',
          `--format=${SNAPSHOT_COMMIT_MARKER}%h %s`,
          '--',
          DATA_DIR,
        ],
        { cwd: PROJECT_ROOT, encoding: 'utf-8' }
      )
    )
  } catch {
    return new Map()
  }
}

function graphTally(total: Total): GraphTally {
  const { byte, line } = average(total)
  const entries = entryOf(total) ?? null
  return {
    files: total.file,
    entries,
    lines: total.line,
    bytes: total.byte,
    bytesAllocated: total.byteAllocated ?? null,
    bpf: byte.per.file,
    bpl: byte.per.line,
    bpe:
      entries === null
        ? null
        : divide(total.byte, entries, RATIO_DECIMALS.byte),
    lpf: line.per.file,
    lpe:
      entries === null
        ? null
        : divide(total.line, entries, RATIO_DECIMALS.line),
  }
}

// Each point carries both tallies, the tests in and the tests out, so the
// page switches between them without counting anything itself.
export function graphEntries(
  snapshots: readonly SnapshotFile[],
  commitByFilename: ReadonlyMap<string, string> = new Map()
): GraphEntry[] {
  return snapshots.map(
    ({ filename, snap: { commit, test, total } }): GraphEntry => ({
      t: snapshotLabel(filename),
      commit: commit ?? commitByFilename.get(filename) ?? null,
      withTest: graphTally(total),
      withoutTest:
        test === undefined ? null : graphTally(subtractTotal(total, test)),
    })
  )
}

// Regenerates latest.md and the graph entirely from whatever's already on
// disk in data/ — never scans src/ itself, so it reflects the current
// snapshot history regardless of whether collect() ran in this same
// process or days ago.
async function render(): Promise<void> {
  const snapshots = readSnapshots(DATA_DIR)
  const last = snapshots.at(-1)
  if (last === undefined) {
    console.warn(
      `No snapshots in ${DATA_DIR} yet — nothing to render; run with --collect-only (or unflagged) first.`
    )
    return
  }
  writeFileSync(
    LATEST_MD,
    renderLatestMd(last.snap, snapshots.slice(0, -1).at(-1)?.snap)
  )

  const entries = graphEntries(snapshots, readSnapshotCommit())
  mkdirSync(GRAPH_DIR, { recursive: true })
  // JSON.stringify's own output (double-quoted keys/strings, no trailing
  // commas) never matches this project's Prettier style, so every
  // regeneration would otherwise re-break `format:check` on its own — run
  // it back through Prettier itself (already a devDependency) rather than
  // hand-replicating whatever .prettierrc currently says.
  const graphData = generateGraphData(entries, basename(PROJECT_ROOT))
  writeFileSync(GRAPH_DATA_JS, await formatLike(GRAPH_DATA_JS, graphData))

  console.info(
    `Rendered latest.md + graph from ${snapshots.length} snapshot(s); open or reload ${GRAPH_HTML}`
  )
}

// process.argv is [node executable, this script's path, ...actual args] —
// the standard Node CLI idiom for dropping the first two to get argv proper.
const ARGV_SCRIPT_OFFSET = 2

export function parseArgs(args: readonly string[]): {
  check: boolean
  collect: boolean
  drop: readonly string[]
  render: boolean
} {
  const check = args.includes('--check')
  const collectOnly = args.includes('--collect-only')
  const renderOnly = args.includes('--render-only')
  const dropAt = args.indexOf('--drop')
  if (collectOnly && renderOnly) {
    throw new Error('--collect-only and --render-only are mutually exclusive')
  }
  if (
    [check, dropAt !== -1, collectOnly || renderOnly].filter(Boolean).length > 1
  ) {
    throw new Error('--check and --drop run alone')
  }
  if (dropAt !== -1) {
    const drop = args.slice(dropAt + 1)
    if (drop.length === 0) {
      throw new Error('--drop names the snapshots to drop')
    }
    return { check, collect: false, drop, render: true }
  }
  return check
    ? { check, collect: false, drop: [], render: false }
    : { check, collect: !renderOnly, drop: [], render: !collectOnly }
}

export function dropSnapshots({
  dataDir,
  name,
  recycle,
}: {
  readonly dataDir: string
  readonly name: readonly string[]
  readonly recycle: (path: string) => void
}): string[] {
  const path = name.map((each): string => join(dataDir, basename(each)))
  const missing = path.filter(
    (each): boolean => !each.endsWith('.json') || !existsSync(each)
  )
  if (missing.length > 0) {
    throw new Error(`No such snapshot: ${missing.join(', ')}`)
  }
  for (const each of path) {
    recycle(each)
  }
  return path
}

function recycleFile(path: string): void {
  if (process.platform !== 'win32') {
    throw new Error('--drop moves snapshots to the Windows Recycle Bin')
  }
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${path.replaceAll("'", "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`,
  ])
}

function runGit(...argument: readonly string[]): void {
  execFileSync('git', argument, { cwd: PROJECT_ROOT })
}

async function formatLike(path: string, source: string): Promise<string> {
  return format(source, { ...(await resolveConfig(path)), filepath: path })
}

function readFileOrEmpty(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

async function check(): Promise<void> {
  const snapshots = readSnapshots(DATA_DIR)
  const graphData = readFileOrEmpty(GRAPH_DATA_JS)
  const drift = findGraphDataDrift(
    graphData === '' ? [] : readGraphDataEntries(graphData),
    graphEntries(snapshots)
  )
  const project = basename(PROJECT_ROOT)
  if (graphData !== '' && readGraphDataProject(graphData) !== project) {
    drift.push(`graph/data.js does not name the project ${project}`)
  }
  const last = snapshots.at(-1)
  if (
    last !== undefined &&
    (await formatLike(
      LATEST_MD,
      renderLatestMd(last.snap, snapshots.slice(0, -1).at(-1)?.snap)
    )) !== (await formatLike(LATEST_MD, readFileOrEmpty(LATEST_MD)))
  ) {
    drift.push('latest.md differs from the newest snapshot in data/')
  }
  for (const each of drift) {
    console.error(each)
  }
  if (drift.length > 0) {
    console.error('Run npm run stats:general:render to regenerate them.')
    process.exitCode = 1
    return
  }
  console.info('The stats graph and latest.md match data/.')
}

async function main(): Promise<void> {
  const step = parseArgs(process.argv.slice(ARGV_SCRIPT_OFFSET))
  if (step.check) {
    await check()
  }
  if (step.collect) {
    report(
      collect(statsConfig, PROJECT_ROOT, DATA_DIR, new Date()),
      scanByteOnDisk(statsConfig, PROJECT_ROOT)
    )
  }
  if (step.drop.length > 0) {
    const dropped = dropSnapshots({
      dataDir: DATA_DIR,
      name: step.drop,
      recycle: recycleFile,
    })
    runGit('rm', '--cached', '--quiet', '--ignore-unmatch', '--', ...dropped)
  }
  if (step.render) {
    await render()
  }
  if (step.drop.length > 0) {
    runGit('add', '--', LATEST_MD, GRAPH_DATA_JS)
  }
}

// Runs main() when this file is launched directly (`tsx stats/general/
// script.ts ...`), but not when script.test.ts imports it for its pure
// helpers — a plain top-level call would fire collect()/render()'s fs
// writes and browser-open as a side effect of merely importing the module.
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}

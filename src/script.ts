import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { format, resolveConfig } from 'prettier'

import { scanByteOnDisk } from './byte/on/disk/scan.js'
import { configDefault } from './config/default.js'
import { findGraphDataDrift } from './graph/data/drift/find.js'
import { readGraphDataEntry } from './graph/data/entry/read.js'
import { generateGraphData } from './graph/data/generate.js'
import { readGraphDataProject } from './graph/data/project/read.js'
import { createGraphEntryList } from './graph/entry/list/create.js'
import { renderLatestMd } from './latest/md/render.js'
import { reportMeasure } from './measure/report.js'
import { findProjectRootDir } from './project/root/dir/find.js'
import { collectSnapshot } from './snapshot/collect.js'
import { readSnapshotCommit } from './snapshot/commit/read.js'
import { dropSnapshot } from './snapshot/drop.js'
import { readSnapshotFile } from './snapshot/file/read.js'

const BASE_DIR = import.meta.dirname
const DATA_DIR = join(BASE_DIR, 'data')
const GRAPH_DIR = join(BASE_DIR, 'graph')
const GRAPH_DATA_JS = join(GRAPH_DIR, 'data.js')
const LATEST_MD = join(BASE_DIR, 'latest.md')
const GRAPH_HTML = join(BASE_DIR, 'graph.html')
const PROJECT_ROOT = findProjectRootDir(BASE_DIR)

async function formatLike(path: string, source: string): Promise<string> {
  return format(source, { ...(await resolveConfig(path)), filepath: path })
}

// Regenerates latest.md and the graph entirely from whatever's already on
// disk in data/: it never scans the source itself, so it reflects the
// snapshot history regardless of when the snapshots were collected.
async function render(): Promise<void> {
  const snapshotFile = readSnapshotFile(DATA_DIR)
  const last = snapshotFile.at(-1)
  if (last === undefined) {
    console.warn(
      `No snapshots in ${DATA_DIR} yet: nothing to render; run with --collect-only (or unflagged) first.`
    )
    return
  }
  writeFileSync(
    LATEST_MD,
    renderLatestMd(last.snapshot, snapshotFile.slice(0, -1).at(-1)?.snapshot)
  )

  const entries = createGraphEntryList(
    snapshotFile,
    readSnapshotCommit(PROJECT_ROOT, DATA_DIR)
  )
  mkdirSync(GRAPH_DIR, { recursive: true })
  const graphData = generateGraphData(entries, basename(PROJECT_ROOT))
  writeFileSync(GRAPH_DATA_JS, await formatLike(GRAPH_DATA_JS, graphData))

  console.info(
    `Rendered latest.md + graph from ${snapshotFile.length} snapshot(s); open or reload ${GRAPH_HTML}`
  )
}

// process.argv is [node executable, this script's path, ...actual args].
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

function readFileOrEmpty(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

async function check(): Promise<void> {
  const snapshotFile = readSnapshotFile(DATA_DIR)
  const graphData = readFileOrEmpty(GRAPH_DATA_JS)
  const drift = findGraphDataDrift(
    graphData === '' ? [] : readGraphDataEntry(graphData),
    createGraphEntryList(snapshotFile)
  )
  const project = basename(PROJECT_ROOT)
  if (graphData !== '' && readGraphDataProject(graphData) !== project) {
    drift.push(`graph/data.js does not name the project ${project}`)
  }
  const last = snapshotFile.at(-1)
  if (
    last !== undefined &&
    (await formatLike(
      LATEST_MD,
      renderLatestMd(last.snapshot, snapshotFile.slice(0, -1).at(-1)?.snapshot)
    )) !== (await formatLike(LATEST_MD, readFileOrEmpty(LATEST_MD)))
  ) {
    drift.push('latest.md differs from the newest snapshot in data/')
  }
  for (const each of drift) {
    console.error(each)
  }
  if (drift.length > 0) {
    console.error('Run with --render-only to regenerate them.')
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
    reportMeasure(
      collectSnapshot(configDefault, PROJECT_ROOT, DATA_DIR, new Date()),
      scanByteOnDisk(configDefault, PROJECT_ROOT)
    )
  }
  if (step.drop.length > 0) {
    const dropped = dropSnapshot({
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

// Runs main() when launched directly, not when a test imports parseArgs.
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}

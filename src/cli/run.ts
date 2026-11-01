import { join } from 'node:path'

import { scanByteOnDisk } from '../byte/on/disk/scan.js'
import { reportMeasure } from '../measure/report.js'
import { readPackageVersion } from '../package/version/read.js'
import { checkStats } from '../stats/check.js'
import { collectStats } from '../stats/collect.js'
import { dropStats } from '../stats/drop.js'
import { readStats } from '../stats/read.js'
import { renderStats } from '../stats/render.js'
import type { Stats } from '../stats.js'

import { parseCliArgument } from './argument/parse.js'
import { cliUsage } from './usage.js'

function collect(stats: Stats): void {
  reportMeasure(
    stats.project,
    collectStats(stats, new Date()),
    scanByteOnDisk(stats.config, stats.rootDir)
  )
}

async function render(stats: Stats): Promise<void> {
  const count = await renderStats(stats)
  if (count === 0) {
    console.warn(
      `No snapshots in ${stats.path.data} yet: nothing to render; take one first.`
    )
    return
  }
  console.info(
    `Rendered latest.md and the page from ${count} snapshot(s); open or reload ${join(stats.path.dir, 'graph.html')}`
  )
}

async function check(stats: Stats): Promise<number> {
  const drift = await checkStats(stats)
  if (drift.length === 0) {
    console.info('The page and latest.md match the snapshots.')
    return 0
  }
  for (const each of drift) {
    console.error(each)
  }
  console.error('Run code-growth render to regenerate them.')
  return 1
}

async function run(args: readonly string[], cwd: string): Promise<number> {
  const { command, dir, snapshot } = parseCliArgument(args)
  if (command === 'help') {
    console.info(cliUsage)
    return 0
  }
  if (command === 'version') {
    console.info(readPackageVersion())
    return 0
  }
  const stats = readStats(cwd, dir)
  if (command === 'check') {
    return check(stats)
  }
  if (command === 'drop') {
    await dropStats(stats, snapshot)
  }
  if (command === 'collect' || command === 'run') {
    collect(stats)
  }
  if (command === 'render' || command === 'run') {
    await render(stats)
  }
  return 0
}

/** Runs one command line from a folder, and returns the exit code. */
export async function runCli(
  args: readonly string[],
  cwd: string
): Promise<number> {
  try {
    return await run(args, cwd)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

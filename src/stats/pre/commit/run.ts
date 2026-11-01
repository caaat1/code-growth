import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { isConfigMeasuredPath } from '../../../config/measured/path/is.js'
import { runGit } from '../../../git/run.js'
import { createSnapshotFilename } from '../../../snapshot/filename/create.js'
import type { Stats } from '../../../stats.js'
import { collectStats } from '../../collect.js'
import { readStatsPathGenerated } from '../../path/generated/read.js'
import { renderStats } from '../../render.js'

/**
 * The Git hook's step, whose message it returns. A commit staging anything the
 * config measures gets a snapshot of itself, so a push never leaves a fresh
 * one behind; a commit only changing snapshots (one removed by hand) gets the
 * page re-rendered from them. It stages exactly the files it writes, never
 * the folder, so nothing else rides along. The render reads the snapshots on
 * disk, so while the data folder holds changes the commit doesn't stage, the
 * step skips rather than rendering what the commit's snapshots don't match.
 */
export async function runStatsPreCommit(
  stats: Stats,
  date: Date
): Promise<string> {
  const { config, path, rootDir } = stats
  const data = relative(rootDir, path.data).split(sep).join('/')
  if (
    runGit(rootDir, 'diff', '--name-only', '--', path.data) !== '' ||
    runGit(
      rootDir,
      'ls-files',
      '--others',
      '--exclude-standard',
      '--',
      path.data
    ) !== ''
  ) {
    return `Stats skipped: stage or restore the snapshot changes in ${data} first.`
  }
  // --no-renames: a file moved out of what's measured counts on both sides.
  // -z: names as they are, however git would quote them otherwise.
  const staged = runGit(
    rootDir,
    'diff',
    '--cached',
    '--name-only',
    '--no-renames',
    '--relative',
    '-z'
  )
    .split('\0')
    .filter((each): boolean => each !== '')
  const stage = (...file: readonly string[]): void => {
    runGit(
      rootDir,
      'add',
      '--',
      ...readStatsPathGenerated(path).filter(existsSync),
      ...file
    )
  }
  if (staged.some((each): boolean => isConfigMeasuredPath(config, each))) {
    await collectStats(stats, date)
    await renderStats(stats)
    stage(join(path.data, createSnapshotFilename(date)))
    return 'Stats snapshot taken and staged.'
  }
  if (staged.some((each): boolean => each.startsWith(`${data}/`))) {
    await renderStats(stats)
    stage()
    return 'Stats re-rendered from the staged snapshots.'
  }
  return 'No staged measured or snapshot changes: stats snapshot skipped.'
}

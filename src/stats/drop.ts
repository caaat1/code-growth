import { existsSync } from 'node:fs'

import { recycleFile } from '../file/recycle.js'
import { removeGitFile } from '../git/file/remove.js'
import { runGit } from '../git/run.js'
import { dropSnapshot } from '../snapshot/drop.js'
import type { Stats } from '../stats.js'

import { readStatsPathGenerated } from './path/generated/read.js'
import { renderStats } from './render.js'

/**
 * Takes snapshots out of the history and re-renders without them, staging the
 * result. On Windows a snapshot goes to the Recycle Bin; elsewhere through
 * git rm, which only takes a tracked one, so it stays recoverable.
 */
export async function dropStats(
  stats: Stats,
  name: readonly string[]
): Promise<void> {
  const { path, rootDir } = stats
  const dropped = dropSnapshot({
    dataDir: path.data,
    name,
    recycle:
      process.platform === 'win32'
        ? recycleFile
        : (each): void => {
            removeGitFile(rootDir, each)
          },
  })
  runGit(
    rootDir,
    'rm',
    '--cached',
    '--quiet',
    '--ignore-unmatch',
    '--',
    ...dropped
  )
  await renderStats(stats)
  runGit(
    rootDir,
    'add',
    '--',
    ...readStatsPathGenerated(path).filter(existsSync)
  )
}

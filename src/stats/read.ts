import { basename, resolve } from 'node:path'

import { configDefault } from '../config/default.js'
import { findProjectRootDir } from '../project/root/dir/find.js'
import type { Stats } from '../stats.js'

import { statsDirDefault } from './dir/default.js'
import { createStatsPath } from './path/create.js'

/**
 * The stats of the project around a folder: the nearest ancestor holding
 * package.json, whatever folder the tool runs from.
 */
export function readStats(cwd: string, dir: string = statsDirDefault): Stats {
  const rootDir = findProjectRootDir(cwd)
  return {
    config: configDefault,
    path: createStatsPath(resolve(rootDir, dir)),
    project: basename(rootDir),
    rootDir,
  }
}

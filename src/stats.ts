import type { Config } from './config.js'
import type { StatsPath } from './stats/path.js'

/** One project's stats: what to measure, and where everything is kept. */
export interface Stats {
  readonly config: Config
  readonly path: StatsPath
  /** What titles the page and latest.md: the config's, or the folder's name. */
  readonly project: string
  readonly rootDir: string
}

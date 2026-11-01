import { join } from 'node:path'

import type { StatsPath } from '../path.js'

export function createStatsPath(dir: string): StatsPath {
  return {
    data: join(dir, 'data'),
    dir,
    graphData: join(dir, 'graph', 'data.js'),
    latestMd: join(dir, 'latest.md'),
  }
}

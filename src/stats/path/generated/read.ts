import { join } from 'node:path'

import { pageFile } from '../../../page/file.js'
import type { StatsPath } from '../../path.js'

/** Every file a render writes, the ones a commit stages along. */
export function readStatsPathGenerated(path: StatsPath): string[] {
  return [
    path.latestMd,
    path.graphData,
    ...pageFile.map((each): string => join(path.dir, each)),
  ]
}

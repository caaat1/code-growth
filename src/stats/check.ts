import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { readConfigScope } from '../config/scope/read.js'
import { readFileOrEmpty } from '../file/or/empty/read.js'
import { findGraphDataDrift } from '../graph/data/drift/find.js'
import { readGraphDataEntry } from '../graph/data/entry/read.js'
import { readGraphDataProject } from '../graph/data/project/read.js'
import { readGraphDataScope } from '../graph/data/scope/read.js'
import { createGraphEntryList } from '../graph/entry/list/create.js'
import { pageDir } from '../page/dir.js'
import { pageFile } from '../page/file.js'
import { readSnapshotFile } from '../snapshot/file/read.js'
import { formatSource } from '../source/format.js'
import type { Stats } from '../stats.js'

import { renderStatsLatestMd } from './latest/md/render.js'

/**
 * How what's rendered differs from what a render would write now, in words;
 * nothing when they match. Reads only: a new version of the tool shows up
 * here until the next render. Unless the config names the project, the files
 * keep whatever name they were rendered under: it was the folder's, and a
 * checkout in a folder named otherwise (CI's, say) has drifted from nothing.
 */
export async function checkStats(stats: Stats): Promise<string[]> {
  const { config, path, rootDir } = stats
  const snapshotFile = readSnapshotFile(path.data)
  const graphData = readFileOrEmpty(path.graphData)
  const drift = findGraphDataDrift(
    graphData === '' ? [] : readGraphDataEntry(graphData),
    createGraphEntryList(snapshotFile)
  )
  const written = graphData === '' ? undefined : readGraphDataProject(graphData)
  const project =
    config.project ?? (typeof written === 'string' ? written : stats.project)
  if (graphData !== '' && written !== project) {
    drift.push(`graph/data.js does not name the project ${project}`)
  }
  const scope = readConfigScope(config)
  if (graphData !== '' && readGraphDataScope(graphData) !== scope) {
    drift.push(`graph/data.js does not name the scope ${scope}`)
  }
  const isSame = async (target: string, source: string): Promise<boolean> =>
    (await formatSource(rootDir, target, source)) ===
    (await formatSource(rootDir, target, readFileOrEmpty(target)))
  const latestMd = renderStatsLatestMd(project, snapshotFile)
  if (latestMd === undefined) {
    return drift
  }
  if (!(await isSame(path.latestMd, latestMd))) {
    drift.push('latest.md differs from the newest snapshot in data/')
  }
  for (const each of pageFile) {
    const source = readFileSync(join(pageDir, each), 'utf-8')
    if (!(await isSame(join(path.dir, each), source))) {
      drift.push(`${each} differs from this version's page`)
    }
  }
  return drift
}

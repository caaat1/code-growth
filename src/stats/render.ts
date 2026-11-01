import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { readConfigScope } from '../config/scope/read.js'
import { generateGraphData } from '../graph/data/generate.js'
import { createGraphEntryList } from '../graph/entry/list/create.js'
import { pageDir } from '../page/dir.js'
import { pageFile } from '../page/file.js'
import { readSnapshotCommit } from '../snapshot/commit/read.js'
import { readSnapshotFile } from '../snapshot/file/read.js'
import { formatSource } from '../source/format.js'
import type { Stats } from '../stats.js'

import { renderStatsLatestMd } from './latest/md/render.js'

/**
 * Regenerates latest.md and the page entirely from the snapshots on disk. It
 * never scans the source itself, so it reflects the snapshot history whenever
 * the snapshots were collected. The page is copied in, so it opens from a
 * fresh clone with nothing installed. Returns how many snapshots it rendered;
 * with none it writes nothing.
 */
export async function renderStats(stats: Stats): Promise<number> {
  const { config, path, project, rootDir } = stats
  const snapshotFile = readSnapshotFile(path.data)
  const latestMd = renderStatsLatestMd(project, snapshotFile)
  if (latestMd === undefined) {
    return 0
  }
  const write = async (target: string, source: string): Promise<void> => {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, await formatSource(rootDir, target, source))
  }
  await write(path.latestMd, latestMd)
  await write(
    path.graphData,
    generateGraphData(
      createGraphEntryList(
        snapshotFile,
        readSnapshotCommit(rootDir, path.data)
      ),
      project,
      readConfigScope(config)
    )
  )
  for (const each of pageFile) {
    await write(
      join(path.dir, each),
      readFileSync(join(pageDir, each), 'utf-8')
    )
  }
  return snapshotFile.length
}

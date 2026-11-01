import { renderLatestMd } from '../../../latest/md/render.js'
import type { SnapshotFile } from '../../../snapshot/file.js'

/** latest.md from a project's snapshots, oldest first; none gives nothing. */
export function renderStatsLatestMd(
  project: string,
  snapshotFile: readonly SnapshotFile[]
): string | undefined {
  const last = snapshotFile.at(-1)
  return last === undefined
    ? undefined
    : renderLatestMd(
        project,
        last.snapshot,
        snapshotFile.slice(0, -1).at(-1)?.snapshot
      )
}

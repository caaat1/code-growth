import type { SnapshotFile } from '../../../snapshot/file.js'
import { readSnapshotFilenameLabel } from '../../../snapshot/filename/label/read.js'
import { subtractTotal } from '../../../total/subtract.js'
import type { GraphEntry } from '../../entry.js'
import { createGraphTally } from '../../tally/create.js'

/**
 * Each point carries both tallies, the tests in and the tests out, so the
 * page switches between them without counting anything itself.
 */
export function createGraphEntryList(
  snapshotFile: readonly SnapshotFile[],
  commitByFilename: ReadonlyMap<string, string> = new Map()
): GraphEntry[] {
  return snapshotFile.map(
    ({ filename, snapshot: { commit, test, total } }): GraphEntry => ({
      t: readSnapshotFilenameLabel(filename),
      commit: commit ?? commitByFilename.get(filename) ?? null,
      withTest: createGraphTally(total),
      withoutTest:
        test === undefined
          ? null
          : createGraphTally(subtractTotal(total, test)),
    })
  )
}

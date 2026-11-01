import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import type { Snapshot } from '../../snapshot.js'
import type { SnapshotFile } from '../file.js'

/** Every snapshot of a data folder, oldest first; none if it doesn't exist. */
export function readSnapshotFile(dataDir: string): SnapshotFile[] {
  let filenames: string[]
  try {
    filenames = readdirSync(dataDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
  return filenames
    .filter((filename): boolean => filename.endsWith('.json'))
    .sort()
    .map((filename): SnapshotFile => ({
      filename,
      snapshot: JSON.parse(
        readFileSync(join(dataDir, filename), 'utf-8')
      ) as Snapshot,
    }))
}

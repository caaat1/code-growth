import type { Snapshot } from '../snapshot.js'

export interface SnapshotFile {
  filename: string
  snapshot: Snapshot
}

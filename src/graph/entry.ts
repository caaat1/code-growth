import type { GraphTally } from './tally.js'

export interface GraphEntry {
  commit: string | null
  t: string
  withTest: GraphTally
  /** null for a snapshot that holds no tally of its tests. */
  withoutTest: GraphTally | null
}

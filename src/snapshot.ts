import type { Total } from './total.js'

export interface Snapshot {
  /**
   * The commit the snapshot measured, stored only when it is known at
   * collection (a backfill from git history); otherwise rendering asks git
   * which commit added the snapshot file.
   */
  commit?: string
  /** Absent from a snapshot taken before the tests were tallied apart. */
  test?: Total
  total: Total
}

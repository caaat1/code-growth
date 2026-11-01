import type { Total } from '../../total.js'

/** A row of a latest.md table; a value no tally knows drops the row. */
export interface LatestMdRow {
  decimals: number
  label: string
  read: (total: Total) => number | undefined
}

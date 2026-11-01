import type { Total } from '../../total.js'

/**
 * One tally latest.md shows: the newest total and the one before it, for the
 * trend, under a column heading of its own once there are two.
 */
export interface LatestMdTally {
  current: Total
  heading?: string
  previous: Total | undefined
}

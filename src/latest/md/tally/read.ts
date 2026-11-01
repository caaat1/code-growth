import type { Snapshot } from '../../../snapshot.js'
import { subtractTotal } from '../../../total/subtract.js'
import type { LatestMdTally } from '../tally.js'

/**
 * Every file, and once the newest snapshot holds a test tally, the files
 * without the tests beside them; a previous snapshot without one leaves that
 * tally's trend blank.
 */
export function readLatestMdTally(
  last: Snapshot,
  previous: Snapshot | undefined
): LatestMdTally[] {
  if (last.test === undefined) {
    return [{ current: last.total, previous: previous?.total }]
  }
  return [
    { current: last.total, heading: 'with tests', previous: previous?.total },
    {
      current: subtractTotal(last.total, last.test),
      heading: 'without tests',
      previous:
        previous?.test === undefined
          ? undefined
          : subtractTotal(previous.total, previous.test),
    },
  ]
}

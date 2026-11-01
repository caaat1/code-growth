import type { MdTableAlignment } from '../../../md/table/alignment.js'
import { createMdTable } from '../../../md/table/create.js'
import { formatNumber } from '../../../number/format.js'
import { formatTrend } from '../../../trend/format.js'
import type { LatestMdHeading } from '../heading.js'
import type { LatestMdRow } from '../row.js'
import type { LatestMdTally } from '../tally.js'

export function createLatestMdTable(
  heading: LatestMdHeading,
  row: readonly LatestMdRow[],
  tally: readonly LatestMdTally[],
  hasTrend: boolean
): string {
  const header = [
    heading.label,
    ...tally.flatMap((each): string[] => {
      const value = each.heading ?? heading.value
      return hasTrend ? [value, 'trend'] : [value]
    }),
  ]
  const body = row.flatMap(({ decimals, label, read }): string[][] => {
    const value = tally.map(({ current }): number | undefined => read(current))
    if (value.every((each): boolean => each === undefined)) {
      return []
    }
    return [
      [
        label,
        ...tally.flatMap((each, index): string[] => {
          const current = value.at(index)
          const cell =
            current === undefined ? '' : formatNumber(current, decimals)
          if (!hasTrend) {
            return [cell]
          }
          const before =
            each.previous === undefined ? undefined : read(each.previous)
          return [
            cell,
            current === undefined ? '' : formatTrend(current, before, decimals),
          ]
        }),
      ],
    ]
  })
  return createMdTable(
    header,
    header.map((_, index): MdTableAlignment =>
      index === 0 ? 'left' : 'right'
    ),
    body
  )
}

import { ratioDecimal } from '../../../../../ratio/decimal.js'
import { readTotalAverage } from '../../../../../total/average/read.js'
import type { LatestMdRow } from '../../../row.js'

export const latestMdRowBytePerLine: readonly LatestMdRow[] = [
  {
    decimals: ratioDecimal.bytePerLine,
    label: 'byte / line',
    read: (total): number => readTotalAverage(total).byte.per.line,
  },
]

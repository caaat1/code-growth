import { ratioDecimal } from '../../../../../ratio/decimal.js'
import { readTotalAverage } from '../../../../../total/average/read.js'
import { readTotalPerEntry } from '../../../../../total/per/entry/read.js'
import type { LatestMdRow } from '../../../row.js'

export const latestMdRowBytePerFile: readonly LatestMdRow[] = [
  {
    decimals: ratioDecimal.byte,
    label: 'byte / file',
    read: (total): number => readTotalAverage(total).byte.per.file,
  },
  {
    decimals: ratioDecimal.byte,
    label: 'byte / entry',
    read: readTotalPerEntry('byte', ratioDecimal.byte),
  },
]

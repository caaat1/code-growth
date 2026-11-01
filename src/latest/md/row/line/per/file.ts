import { ratioDecimal } from '../../../../../ratio/decimal.js'
import { readTotalAverage } from '../../../../../total/average/read.js'
import { readTotalPerEntry } from '../../../../../total/per/entry/read.js'
import type { LatestMdRow } from '../../../row.js'

export const latestMdRowLinePerFile: readonly LatestMdRow[] = [
  {
    decimals: ratioDecimal.line,
    label: 'line / file',
    read: (total): number => readTotalAverage(total).line.per.file,
  },
  {
    decimals: ratioDecimal.line,
    label: 'line / entry',
    read: readTotalPerEntry('line', ratioDecimal.line),
  },
]

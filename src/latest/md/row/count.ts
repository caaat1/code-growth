import { readTotalEntry } from '../../../total/entry/read.js'
import type { LatestMdRow } from '../row.js'

export const latestMdRowCount: readonly LatestMdRow[] = [
  { decimals: 0, label: 'byte', read: (total): number => total.byte },
  {
    decimals: 0,
    label: 'byte allocated (nominal 4 KiB)',
    read: (total): number | undefined => total.byteAllocated,
  },
  { decimals: 0, label: 'line', read: (total): number => total.line },
  { decimals: 0, label: 'file', read: (total): number => total.file },
  { decimals: 0, label: 'entry', read: readTotalEntry },
]

import { divideRatio } from '../../../ratio/divide.js'
import type { Total } from '../../../total.js'
import { readTotalEntry } from '../../entry/read.js'

/** A reader of a count per entry, unknown until folders are counted. */
export function readTotalPerEntry(
  dividend: 'byte' | 'line',
  decimals: number
): (total: Total) => number | undefined {
  return (total): number | undefined => {
    const entry = readTotalEntry(total)
    return entry === undefined
      ? undefined
      : divideRatio(
          dividend === 'byte' ? total.byte : total.line,
          entry,
          decimals
        )
  }
}

import { ratioDecimal } from '../../ratio/decimal.js'
import { divideRatio } from '../../ratio/divide.js'
import { readTotalAverage } from '../../total/average/read.js'
import { readTotalEntry } from '../../total/entry/read.js'
import type { Total } from '../../total.js'
import type { GraphTally } from '../tally.js'

export function createGraphTally(total: Total): GraphTally {
  const { byte, line } = readTotalAverage(total)
  const entries = readTotalEntry(total) ?? null
  return {
    files: total.file,
    entries,
    lines: total.line,
    bytes: total.byte,
    bytesAllocated: total.byteAllocated ?? null,
    bpf: byte.per.file,
    bpl: byte.per.line,
    bpe:
      entries === null
        ? null
        : divideRatio(total.byte, entries, ratioDecimal.byte),
    lpf: line.per.file,
    lpe:
      entries === null
        ? null
        : divideRatio(total.line, entries, ratioDecimal.line),
  }
}

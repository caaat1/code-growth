import type { Measure } from '../measure.js'
import { formatNumber } from '../number/format.js'
import { ratioDecimal } from '../ratio/decimal.js'
import { readTotalAverage } from '../total/average/read.js'

export function reportMeasure(
  project: string,
  { test, total }: Measure,
  byteOnDisk: number
): void {
  const { byte, line } = readTotalAverage(total)
  console.info(`${project} stats`)
  console.info(
    `total
    byte ${formatNumber(total.byte)},
    byte allocated (nominal 4 KiB) ${formatNumber(total.byteAllocated ?? 0)},
    byte on this disk ${formatNumber(byteOnDisk)} (this checkout only, never stored),
    line ${formatNumber(total.line)},
    file ${formatNumber(total.file)},
    entry ${formatNumber(total.file + (total.directory ?? 0))}`
  )
  console.info(
    `of which tests
    byte ${formatNumber(test.byte)},
    line ${formatNumber(test.line)},
    file ${formatNumber(test.file)},
    entry ${formatNumber(test.file + (test.directory ?? 0))}`
  )
  console.info(
    `average
    byte/line ${formatNumber(byte.per.line, ratioDecimal.bytePerLine)},
    byte/file ${formatNumber(byte.per.file, ratioDecimal.byte)},
    line/file ${formatNumber(line.per.file, ratioDecimal.line)}`
  )
}

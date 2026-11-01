import { ratioDecimal } from '../../ratio/decimal.js'
import { divideRatio } from '../../ratio/divide.js'
import type { Total } from '../../total.js'
import type { TotalAverage } from '../average.js'

export function readTotalAverage(total: Total): TotalAverage {
  return {
    byte: {
      per: {
        line: divideRatio(total.byte, total.line, ratioDecimal.bytePerLine),
        file: divideRatio(total.byte, total.file, ratioDecimal.byte),
      },
    },
    line: {
      per: {
        file: divideRatio(total.line, total.file, ratioDecimal.line),
      },
    },
  }
}

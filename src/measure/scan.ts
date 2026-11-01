import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { findConfigEntry } from '../config/entry/find.js'
import { isConfigTestPath } from '../config/test/path/is.js'
import type { Config } from '../config.js'
import type { Measure } from '../measure.js'
import { createTotal } from '../total/create.js'

const ALLOCATION_UNIT = 4096

export function scanMeasure(config: Config, rootDir: string): Measure {
  const total = createTotal()
  const test = createTotal()
  for (const entry of findConfigEntry(config, rootDir)) {
    const path = join(entry.parentPath, entry.name)
    const tally = isConfigTestPath(config.test ?? [], relative(rootDir, path))
      ? [total, test]
      : [total]
    if (entry.isDirectory()) {
      for (const each of tally) {
        each.directory += 1
      }
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    const content = readFileSync(path)
    const line = content.toString().split('\n').length - 1
    for (const each of tally) {
      each.byte += content.byteLength
      each.byteAllocated +=
        Math.ceil(content.byteLength / ALLOCATION_UNIT) * ALLOCATION_UNIT
      each.line += line
      each.file += 1
    }
  }
  return { test, total }
}

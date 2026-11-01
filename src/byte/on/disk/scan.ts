import { statSync } from 'node:fs'
import { join } from 'node:path'

import { findConfigEntry } from '../../../config/entry/find.js'
import type { Config } from '../../../config.js'

const STAT_BLOCK = 512

/**
 * What the files really take on this disk. It varies by checkout, so it's
 * reported but never stored.
 */
export function scanByteOnDisk(config: Config, rootDir: string): number {
  let sum = 0
  for (const entry of findConfigEntry(config, rootDir)) {
    if (entry.isFile()) {
      sum += statSync(join(entry.parentPath, entry.name)).blocks * STAT_BLOCK
    }
  }
  return sum
}

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Config } from '../config.js'
import { scanMeasure } from '../measure/scan.js'
import type { Measure } from '../measure.js'

import { createSnapshotFilename } from './filename/create.js'

const JSON_INDENT = 2

/**
 * Writes one new timestamped snapshot into the data folder from a fresh scan.
 * Pure data collection: it never touches what shows the snapshots, so running
 * it back to back just adds another data point.
 */
export function collectSnapshot(
  config: Config,
  rootDir: string,
  dataDir: string,
  date: Date
): Measure {
  const measure = scanMeasure(config, rootDir)
  if (measure.total.file === 0) {
    throw new Error(
      `No files match include ${JSON.stringify(config.include)} under ${rootDir}: check the config's include.`
    )
  }
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(
    join(dataDir, createSnapshotFilename(date)),
    JSON.stringify(measure, null, JSON_INDENT) + '\n'
  )
  return measure
}

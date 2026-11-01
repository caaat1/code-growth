import type { Measure } from '../measure.js'
import { collectSnapshot } from '../snapshot/collect.js'
import type { Stats } from '../stats.js'

export function collectStats(stats: Stats, date: Date): Measure {
  return collectSnapshot(stats.config, stats.rootDir, stats.path.data, date)
}

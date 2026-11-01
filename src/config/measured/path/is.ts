import { posix } from 'node:path'

import type { Config } from '../../../config.js'
import { expandConfigExcludeEntry } from '../../exclude/entry/expand.js'
import { expandConfigIncludeEntry } from '../../include/entry/expand.js'

/**
 * Whether a path from the project root, with forward slashes, is one the
 * config measures. It asks of a path what a scan finds on disk, so it can also
 * answer for a file just deleted.
 */
export function isConfigMeasuredPath(config: Config, path: string): boolean {
  const isMatching = (pattern: string): boolean =>
    posix.matchesGlob(path, pattern)
  return (
    config.include.map(expandConfigIncludeEntry).some(isMatching) &&
    !(config.exclude ?? []).flatMap(expandConfigExcludeEntry).some(isMatching)
  )
}

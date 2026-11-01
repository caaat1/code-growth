import { globSync } from 'node:fs'
import type { Dirent } from 'node:fs'

import type { Config } from '../../config.js'
import { expandConfigExcludeEntry } from '../exclude/entry/expand.js'
import { expandConfigIncludeEntry } from '../include/entry/expand.js'

/**
 * Every file and folder the config takes in under the project root.
 * Dotfiles and dot-directories stay out without saying so: fs.globSync's own
 * `**` default.
 */
export function findConfigEntry(config: Config, rootDir: string): Dirent[] {
  return globSync(config.include.map(expandConfigIncludeEntry), {
    cwd: rootDir,
    exclude: (config.exclude ?? []).flatMap(expandConfigExcludeEntry),
    withFileTypes: true,
  })
}

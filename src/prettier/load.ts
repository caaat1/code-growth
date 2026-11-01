import { createRequire } from 'node:module'
import { join } from 'node:path'

import type { Prettier } from '../prettier.js'

/**
 * The project's own Prettier, resolved from its root rather than from this
 * package, so a linked or nested install still finds it; undefined without
 * one, since Prettier is optional.
 */
export function loadPrettier(rootDir: string): Prettier | undefined {
  const load = createRequire(join(rootDir, 'package.json'))
  try {
    return load('prettier') as Prettier
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      return undefined
    }
    throw error
  }
}

// @ts-check
import { dirname } from 'node:path'

import { findUpSync } from 'find-up'

/**
 * Nearest ancestor directory containing `package.json`, walking up from
 * `cwd`. Marker-based, so config files stay correct regardless of how deep
 * they sit under the root — no hand-counted `resolve(dirname, '..', ...)`.
 *
 * @param {string} cwd
 * @returns {string}
 */
export function findProjectRootDir(cwd) {
  const packageJsonPath = findUpSync('package.json', { cwd })
  if (!packageJsonPath) {
    throw new Error(`findProjectRootDir: no package.json found above ${cwd}`)
  }
  return dirname(packageJsonPath)
}

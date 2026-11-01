import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { findProjectRootDir } from '../../project/root/dir/find.js'

/** This package's own version. */
export function readPackageVersion(): string {
  const { version } = JSON.parse(
    readFileSync(
      join(findProjectRootDir(import.meta.dirname), 'package.json'),
      'utf-8'
    )
  ) as { version: string }
  return version
}

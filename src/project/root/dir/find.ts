import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * The nearest ancestor directory holding package.json, walking up from
 * `startDir`. Marker-based rather than a hand-counted `'..'`, so a tool finds
 * the project root whatever the invoker's cwd and however deep the tool
 * sits; shared by the tools (the stats tool, the spec syncs).
 */
export function findProjectRootDir(startDir: string): string {
  for (let dir = startDir; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir
    }
    if (dirname(dir) === dir) {
      throw new Error(`No package.json found above ${startDir}`)
    }
  }
}

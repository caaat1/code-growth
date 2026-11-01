import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

/**
 * Hands the named snapshots of a data folder to `recycle`, refusing all of
 * them if any is unknown, and returns their paths.
 */
export function dropSnapshot({
  dataDir,
  name,
  recycle,
}: {
  readonly dataDir: string
  readonly name: readonly string[]
  readonly recycle: (path: string) => void
}): string[] {
  const path = name.map((each): string => join(dataDir, basename(each)))
  const missing = path.filter(
    (each): boolean => !each.endsWith('.json') || !existsSync(each)
  )
  if (missing.length > 0) {
    throw new Error(`No such snapshot: ${missing.join(', ')}`)
  }
  for (const each of path) {
    recycle(each)
  }
  return path
}

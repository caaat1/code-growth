import { posix } from 'node:path'

const PATH_SEPARATOR = /[/\\]/

/**
 * Whether the entry at a path from the project root (either separator) is a
 * test: its path, or the path of a folder holding it, matches one of the
 * test patterns.
 */
export function isConfigTestPath(
  test: readonly string[],
  path: string
): boolean {
  const segment = path.split(PATH_SEPARATOR)
  return segment.some((_, index): boolean => {
    const folderOrSelf = segment.slice(0, index + 1).join('/')
    return test.some((pattern): boolean =>
      posix.matchesGlob(folderOrSelf, pattern)
    )
  })
}

import { posix } from 'node:path'

/**
 * Which files this tool scans — glob patterns resolved against the project
 * root (script.ts's PROJECT_ROOT: the nearest folder holding package.json,
 * walking up from this tool's own), so this stays stable regardless of the
 * invoker's cwd. Deliberately shaped like tsconfig.json's own
 * `include`/`exclude` rather than a single hardcoded path or an env var: an
 * env var can only ever hold one string, and this needed to become
 * pattern-capable (multiple roots, exclusions) the same way tsconfig's
 * `include` already is — no reason to invent a narrower vocabulary for the
 * same idea. A typed module (checked by tsconfig.stats.json) over a JSON
 * config file: real comments, and a rename here is a compile error
 * everywhere it's used instead of a silently stale key.
 */
export interface StatsConfig {
  /**
   * Bare directory entries (no glob metacharacters: `* ? [ ] { }`) are
   * expanded to `<dir>/**\/*` — same default-inclusion shorthand
   * tsconfig.json's own `include` uses for a plain directory name. Written
   * out in full where recursion isn't wanted.
   */
  readonly include: readonly string[]
  /**
   * Glob patterns to exclude on top of `include`. Dotfiles/dot-directories
   * are already skipped unconditionally (fs.globSync's own `**` default,
   * matching this tool's previous hand-rolled scan) — this is for anything
   * further. A bare directory, or a pattern ending in `/**`, also excludes
   * the directory itself (`expandExcludeEntry`), since directories are
   * counted too and `dir/**` alone matches only what's inside.
   */
  readonly exclude?: readonly string[]
  /**
   * Glob patterns that pick the tests among the scanned entries, matched
   * against each entry's path from the project root. An entry inside a
   * folder a pattern matches is a test too, so naming a folder takes in
   * its contents. The total still counts the tests; a tally of their own
   * beside it lets the graph leave them out.
   */
  readonly test?: readonly string[]
}

export const statsConfig: StatsConfig = {
  include: ['src'],
  exclude: [],
  test: ['**/*.test.ts'],
}

const GLOB_METACHARACTER = /[*?[\]{}]/

export function expandIncludeEntry(entry: string): string {
  return GLOB_METACHARACTER.test(entry) ? entry : `${entry}/**/*`
}

export function expandExcludeEntry(entry: string): string[] {
  if (GLOB_METACHARACTER.test(entry)) {
    return entry.endsWith('/**')
      ? [entry.slice(0, -'/**'.length), entry]
      : [entry]
  }
  return [entry, `${entry}/**`]
}

const PATH_SEPARATOR = /[/\\]/

/**
 * Whether the entry at a path from the project root (either separator) is
 * a test: its path, or the path of a folder holding it, matches one of the
 * test patterns.
 */
export function isTestPath(test: readonly string[], path: string): boolean {
  const segment = path.split(PATH_SEPARATOR)
  return segment.some((_, index): boolean => {
    const folderOrSelf = segment.slice(0, index + 1).join('/')
    return test.some((pattern): boolean =>
      posix.matchesGlob(folderOrSelf, pattern)
    )
  })
}

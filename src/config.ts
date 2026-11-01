/**
 * Which files to scan: glob patterns resolved against the project root,
 * shaped like tsconfig.json's own `include`/`exclude`.
 */
export interface Config {
  /**
   * Bare directory entries (no glob metacharacters: `* ? [ ] { }`) are
   * expanded to `<dir>/**\/*`, the same shorthand tsconfig.json's own
   * `include` uses for a plain directory name. Written out in full where
   * recursion isn't wanted.
   */
  readonly include: readonly string[]
  /**
   * Glob patterns to exclude on top of `include`. Dotfiles and
   * dot-directories are already skipped unconditionally (fs.globSync's own
   * `**` default). A bare directory, or a pattern ending in `/**`, also
   * excludes the directory itself, since directories are counted too and
   * `dir/**` alone matches only what's inside.
   */
  readonly exclude?: readonly string[]
  /**
   * Glob patterns that pick the tests among the scanned entries, matched
   * against each entry's path from the project root. An entry inside a
   * folder a pattern matches is a test too, so naming a folder takes in its
   * contents. The total still counts the tests; a tally of their own beside
   * it lets the page leave them out.
   */
  readonly test?: readonly string[]
}

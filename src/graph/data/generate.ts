import type { GraphEntry } from '../entry.js'

/**
 * The script the page loads its points from, since a page opened from disk
 * can't read data/ itself. The project's folder name titles the page, so the
 * pages of several projects open side by side tell apart; the scope says what
 * was measured.
 */
export function generateGraphData(
  entries: readonly GraphEntry[],
  project: string,
  scope: string
): string {
  return `const project = ${JSON.stringify(project)}\nconst scope = ${JSON.stringify(scope)}\nconst raw = ${JSON.stringify(entries)}\n`
}

import type { GraphEntry } from '../entry.js'

/**
 * The script the page loads its points from, since a page opened from disk
 * can't read data/ itself. The project's folder name titles the page, so the
 * pages of several projects open side by side tell apart.
 */
export function generateGraphData(
  entries: readonly GraphEntry[],
  project: string
): string {
  return `const project = ${JSON.stringify(project)}\nconst raw = ${JSON.stringify(entries)}\n`
}

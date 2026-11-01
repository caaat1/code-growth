import type { GraphEntry } from '../../entry.js'

function stringifyWithoutCommit(entry: unknown): string {
  const { commit: _commit, ...rest } = entry as Record<string, unknown>
  return JSON.stringify(rest)
}

/**
 * How the points in graph/data.js differ from the snapshots'. The commit
 * stays aside: it's asked from git only when rendering.
 */
export function findGraphDataDrift(
  written: readonly unknown[],
  expected: readonly GraphEntry[]
): string[] {
  if (written.length !== expected.length) {
    return [
      `graph/data.js holds ${written.length} snapshot(s), data/ ${expected.length}`,
    ]
  }
  return expected.flatMap((entry, index): string[] =>
    stringifyWithoutCommit(written.at(index)) === stringifyWithoutCommit(entry)
      ? []
      : [`graph/data.js differs from data/ at ${entry.t}`]
  )
}

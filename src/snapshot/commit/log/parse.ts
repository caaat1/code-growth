import { snapshotCommitLogMarker } from './marker.js'

/**
 * Pairs each snapshot file with the commit that added it: the pre-commit step
 * stages a snapshot into the very commit whose changes it measured, so that
 * commit's subject explains the step in the curves. git log lists the newest
 * commit first, so a file added more than once keeps its latest addition.
 */
export function parseSnapshotCommitLog(log: string): Map<string, string> {
  const commitByFilename = new Map<string, string>()
  let commit: string | undefined
  for (const line of log.split('\n')) {
    if (line.startsWith(snapshotCommitLogMarker)) {
      commit = line.slice(snapshotCommitLogMarker.length).trim()
      continue
    }
    const filename = line.trim().split('/').at(-1) ?? ''
    if (
      commit !== undefined &&
      filename.endsWith('.json') &&
      !commitByFilename.has(filename)
    ) {
      commitByFilename.set(filename, commit)
    }
  }
  return commitByFilename
}

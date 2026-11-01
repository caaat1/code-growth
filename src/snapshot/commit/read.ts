import { runGit } from '../../git/run.js'

import { snapshotCommitLogMarker } from './log/marker.js'
import { parseSnapshotCommitLog } from './log/parse.js'

/**
 * The commit that added each snapshot file. Read only, and never fatal:
 * outside a git checkout every point simply has no commit.
 */
export function readSnapshotCommit(
  rootDir: string,
  dataDir: string
): Map<string, string> {
  try {
    return parseSnapshotCommitLog(
      runGit(
        rootDir,
        'log',
        '--diff-filter=A',
        '--name-only',
        `--format=${snapshotCommitLogMarker}%h %s`,
        '--',
        dataDir
      )
    )
  } catch {
    return new Map()
  }
}

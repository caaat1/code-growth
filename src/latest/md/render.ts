import type { Snapshot } from '../../snapshot.js'

import { latestMdHeadingCount } from './(heading)/count.js'
import { latestMdHeadingRatio } from './(heading)/ratio.js'
import type { LatestMdHeading } from './heading.js'
import { latestMdRowBytePerFile } from './row/byte/per/file.js'
import { latestMdRowBytePerLine } from './row/byte/per/line.js'
import { latestMdRowCount } from './row/count.js'
import { latestMdRowLinePerFile } from './row/line/per/file.js'
import type { LatestMdRow } from './row.js'
import { createLatestMdTable } from './table/create.js'
import { readLatestMdTally } from './tally/read.js'

/** The newest snapshot as tables, one per pane of the page. */
export function renderLatestMd(
  project: string,
  last: Snapshot,
  previous?: Snapshot
): string {
  const tally = readLatestMdTally(last, previous)
  const table = (
    heading: LatestMdHeading,
    row: readonly LatestMdRow[]
  ): string => createLatestMdTable(heading, row, tally, previous !== undefined)
  return (
    [
      `# ${project} stats`,
      '## files · entries · lines · bytes',
      table(latestMdHeadingCount, latestMdRowCount),
      '## bytes / file',
      table(latestMdHeadingRatio, latestMdRowBytePerFile),
      '## lines / file',
      table(latestMdHeadingRatio, latestMdRowLinePerFile),
      '## bytes / line',
      table(latestMdHeadingRatio, latestMdRowBytePerLine),
    ].join('\n\n') + '\n'
  )
}

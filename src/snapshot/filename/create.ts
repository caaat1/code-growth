/**
 * Drops the milliseconds and `Z` toISOString() appends, leaving exactly
 * `YYYY-MM-DDTHH:mm:ss`, with its colons made safe for a file name.
 */
export function createSnapshotFilename(date: Date): string {
  const isoSecondsLength = 'YYYY-MM-DDTHH:mm:ss'.length
  return `${date.toISOString().slice(0, isoSecondsLength).replaceAll(':', '-')}.json`
}

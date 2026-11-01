export function readSnapshotFilenameLabel(filename: string): string {
  const base = filename.slice(0, -'.json'.length)
  const timeAt = base.indexOf('T')
  const [, month, day] = base.slice(0, timeAt).split('-')
  const [hour, minute] = base.slice(timeAt + 1).split('-')
  return `${month}/${day} ${hour}:${minute}`
}

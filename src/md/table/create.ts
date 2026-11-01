import type { MdTableAlignment } from './alignment.js'

export function createMdTable(
  headers: readonly string[],
  alignments: readonly MdTableAlignment[],
  rows: readonly (readonly string[])[]
): string {
  const cols = headers.map((header, i): { right: boolean; width: number } => ({
    right: alignments.at(i) === 'right',
    width: Math.max(
      header.length,
      ...rows.map((row): number => row.at(i)?.length ?? 0)
    ),
  }))
  const formatRow = (cells: readonly string[]): string =>
    '| ' +
    cols
      .map((col, i): string => {
        const cell = cells.at(i) ?? ''
        return col.right ? cell.padStart(col.width) : cell.padEnd(col.width)
      })
      .join(' | ') +
    ' |'
  const separatorRow =
    '| ' +
    cols
      .map((col): string =>
        col.right ? '-'.repeat(col.width - 1) + ':' : '-'.repeat(col.width)
      )
      .join(' | ') +
    ' |'
  return [formatRow(headers), separatorRow, ...rows.map(formatRow)].join('\n')
}

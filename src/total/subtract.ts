import type { Total } from '../total.js'

function subtractCount(
  count: number | undefined,
  part: number | undefined
): number | undefined {
  return count === undefined || part === undefined ? undefined : count - part
}

/**
 * The total left once a part of it is taken out; a count either one lacks
 * stays unknown.
 */
export function subtractTotal(total: Total, part: Total): Total {
  const byteAllocated = subtractCount(total.byteAllocated, part.byteAllocated)
  const directory = subtractCount(total.directory, part.directory)
  return {
    byte: total.byte - part.byte,
    ...(byteAllocated === undefined ? {} : { byteAllocated }),
    ...(directory === undefined ? {} : { directory }),
    file: total.file - part.file,
    line: total.line - part.line,
  }
}

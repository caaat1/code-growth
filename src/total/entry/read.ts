import type { Total } from '../../total.js'

/** Files and folders together, once folders are counted. */
export function readTotalEntry(total: Total): number | undefined {
  return total.directory === undefined
    ? undefined
    : total.file + total.directory
}

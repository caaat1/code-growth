import type { Total } from '../total.js'

export function createTotal(): Required<Total> {
  return { byte: 0, byteAllocated: 0, directory: 0, file: 0, line: 0 }
}

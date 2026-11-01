/**
 * What a scan counts. `byteAllocated` and `directory` are absent from a
 * snapshot taken before they were counted.
 */
export interface Total {
  byte: number
  byteAllocated?: number
  directory?: number
  file: number
  line: number
}

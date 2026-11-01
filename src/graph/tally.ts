/**
 * The values a graph point shows for one tally: the tests in it or left out
 * of it. null marks what the snapshot didn't count.
 */
export interface GraphTally {
  bpe: number | null
  bpf: number
  bpl: number
  bytes: number
  bytesAllocated: number | null
  entries: number | null
  files: number
  lines: number
  lpe: number | null
  lpf: number
}

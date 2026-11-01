import { runInNewContext } from 'node:vm'

export function readGraphDataEntry(source: string): unknown[] {
  return runInNewContext(`${source}\nraw`) as unknown[]
}

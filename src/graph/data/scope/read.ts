import { runInNewContext } from 'node:vm'

export function readGraphDataScope(source: string): unknown {
  return runInNewContext(
    `${source}\ntypeof scope === 'undefined' ? undefined : scope`
  )
}

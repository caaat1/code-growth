import { runInNewContext } from 'node:vm'

export function readGraphDataProject(source: string): unknown {
  return runInNewContext(
    `${source}\ntypeof project === 'undefined' ? undefined : project`
  )
}

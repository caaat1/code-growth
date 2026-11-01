import { globMetacharacter } from '../../../glob/metacharacter.js'

export function expandConfigExcludeEntry(entry: string): string[] {
  if (globMetacharacter.test(entry)) {
    return entry.endsWith('/**')
      ? [entry.slice(0, -'/**'.length), entry]
      : [entry]
  }
  return [entry, `${entry}/**`]
}

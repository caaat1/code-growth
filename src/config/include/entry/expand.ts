import { globMetacharacter } from '../../../glob/metacharacter.js'

export function expandConfigIncludeEntry(entry: string): string {
  return globMetacharacter.test(entry) ? entry : `${entry}/**/*`
}

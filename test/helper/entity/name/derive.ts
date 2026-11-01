function capital(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`
}

/**
 * The words a path gives a name, from the general to the specific: every
 * folder and the file's own name below `src/`, parentheses stripped, letter
 * indexes (a single uppercase letter) dropped.
 */
function readWord(path: string): readonly string[] {
  return path
    .replace(/^src\//, '')
    .replace(/\.ts$/, '')
    .split('/')
    .filter((each) => !/^[A-Z]$/.test(each))
    .map((each) => each.replace(/^\((.*)\)$/, '$1'))
}

/**
 * The name a path gives an entity of a kind: an interface or a type in
 * PascalCase, a constant in camelCase, a function leading with its verb, the
 * path's last word (`total/subtract.ts` gives `subtractTotal`).
 */
export function deriveEntityName(kind: string, path: string): string {
  const word = readWord(path)
  if (kind === 'function') {
    return `${word.at(-1) ?? ''}${word.slice(0, -1).map(capital).join('')}`
  }
  const pascal = word.map(capital).join('')
  return kind === 'const'
    ? `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`
    : pascal
}

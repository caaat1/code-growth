// @ts-check
import ts from 'typescript' // already a devDependency

/**
 * Derive eslint-plugin-import `pathGroups` from a tsconfig/jsconfig's
 * `paths`, so the alias list has a single source of truth (the resolver
 * already reads the same file for resolution; this closes the one
 * remaining hand-maintained copy — import ordering). tsconfig/jsconfig is
 * JSONC, so it must be read via the TypeScript API rather than a JSON
 * import.
 *
 * @param {string} configFilePath Absolute path to the tsconfig.json/jsconfig.json to read `paths` from.
 * @returns {{ pattern: string, group: string }[]}
 */
export function getAliasPathGroups(configFilePath) {
  const { config } = ts.readConfigFile(configFilePath, ts.sys.readFile)
  const paths = config?.compilerOptions?.paths ?? {}
  const pathGroups = Object.keys(paths).map((pattern) => ({
    pattern: pattern.replace(/\/\*$/, '/**'), // '@shared/*' -> '@shared/**'
    group: 'internal',
  }))
  return pathGroups
}

import { loadPrettier } from '../prettier/load.js'

/**
 * A generated file's text in the style of the project it lands in, so a
 * regeneration doesn't break the project's format check; as it is in a project
 * without Prettier.
 */
export async function formatSource(
  rootDir: string,
  path: string,
  source: string
): Promise<string> {
  const prettier = loadPrettier(rootDir)
  return prettier === undefined
    ? source
    : prettier.format(source, {
        ...(await prettier.resolveConfig(path)),
        filepath: path,
      })
}

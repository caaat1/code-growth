import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const created: string[] = []

// at the process's exit, as node:test runs each test file in a process of
// its own: a root `after` hook runs once the first of tests awaited one by
// one at the top level is done, before the others make theirs
process.once('exit', (): void => {
  for (const each of created) {
    rmSync(each, { force: true, recursive: true })
  }
})

/**
 * A fresh folder, by default in the system's temporary one, holding the files
 * given, by their paths from it, with their contents; removed, with every
 * other one made here, once the tests of the file are done. The name starts
 * with `-`, so inside a project it's scratch to every tool.
 */
export function createDir(
  file: Readonly<Record<string, string>>,
  parent: string = tmpdir()
): string {
  const dir = mkdtempSync(join(parent, '-test-'))
  created.push(dir)
  for (const [path, content] of Object.entries(file)) {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  return dir
}

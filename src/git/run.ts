import { execFileSync } from 'node:child_process'

/** Git's output, raw; a failure throws. */
export function runGit(
  rootDir: string,
  ...argument: readonly string[]
): string {
  return execFileSync('git', argument, {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

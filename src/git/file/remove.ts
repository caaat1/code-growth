import { runGit } from '../run.js'

/** Removes a tracked file; an untracked one couldn't be got back, so it stays. */
export function removeGitFile(rootDir: string, path: string): void {
  try {
    runGit(rootDir, 'rm', '--quiet', '--force', '--', path)
  } catch {
    throw new Error(
      `${path} is not tracked by git, so removing it couldn't be undone: remove it yourself.`
    )
  }
}

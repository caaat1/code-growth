import { runGit } from '../../../../src/git/run.js'
import { createDir } from '../../dir/create.js'

/** A fresh git repository holding the files given, nothing staged yet. */
export function createGitRepo(file: Readonly<Record<string, string>>): string {
  const rootDir = createDir(file)
  runGit(rootDir, 'init', '--quiet', '--initial-branch=main')
  runGit(rootDir, 'config', 'user.email', 'test@example.com')
  runGit(rootDir, 'config', 'user.name', 'Test')
  runGit(rootDir, 'config', 'commit.gpgsign', 'false')
  return rootDir
}

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { createGitRepo } from '../../../test/helper/git/repo/create.js'
import { runGit } from '../run.js'

import { removeGitFile } from './remove.js'

await test('removeGitFile removes a tracked file from the tree and the index', () => {
  const rootDir = createGitRepo({ 'tracked.json': '{}\n' })
  runGit(rootDir, 'add', '--', 'tracked.json')
  runGit(rootDir, 'commit', '--quiet', '-m', 'Add a file')
  removeGitFile(rootDir, join(rootDir, 'tracked.json'))
  assert.equal(existsSync(join(rootDir, 'tracked.json')), false)
  assert.equal(runGit(rootDir, 'ls-files'), '')
})

await test('removeGitFile refuses an untracked file and leaves it', () => {
  const rootDir = createGitRepo({ 'untracked.json': '{}\n' })
  assert.throws(() => {
    removeGitFile(rootDir, join(rootDir, 'untracked.json'))
  }, /is not tracked by git/)
  assert.ok(existsSync(join(rootDir, 'untracked.json')))
})

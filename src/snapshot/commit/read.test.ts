import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../../test/helper/dir/create.js'
import { createGitRepo } from '../../../test/helper/git/repo/create.js'
import { runGit } from '../../git/run.js'

import { readSnapshotCommit } from './read.js'

await test('readSnapshotCommit names the commit that added each snapshot file', () => {
  const rootDir = createGitRepo({})
  const dataDir = join(rootDir, 'data')
  mkdirSync(dataDir)
  writeFileSync(join(dataDir, 'a.json'), '{}\n')
  runGit(rootDir, 'add', '--', join(dataDir, 'a.json'))
  runGit(rootDir, 'commit', '--quiet', '-m', 'Add a snapshot')
  const hash = runGit(rootDir, 'log', '-1', '--format=%h').trim()
  assert.deepEqual(
    [...readSnapshotCommit(rootDir, dataDir)],
    [['a.json', `${hash} Add a snapshot`]]
  )
})

await test('readSnapshotCommit gives nothing outside a git checkout', () => {
  const rootDir = createDir({})
  assert.deepEqual([...readSnapshotCommit(rootDir, join(rootDir, 'data'))], [])
})

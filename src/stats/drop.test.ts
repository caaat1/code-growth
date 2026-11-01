import assert from 'node:assert/strict'
import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { createGitRepo } from '../../test/helper/git/repo/create.js'
import { removeGitFile } from '../git/file/remove.js'
import { runGit } from '../git/run.js'

import { checkStats } from './check.js'
import { collectStats } from './collect.js'
import { dropStats } from './drop.js'
import { readStats } from './read.js'
import { renderStats } from './render.js'

await test('dropStats takes a snapshot the Recycle Bin removed out of the index too', async () => {
  const rootDir = createGitRepo({ 'package.json': '{}', 'src/a.ts': 'x\n' })
  const stats = readStats(rootDir)
  await collectStats(stats, new Date('2026-09-27T15:12:31Z'))
  await collectStats(stats, new Date('2026-09-28T15:12:31Z'))
  await renderStats(stats)
  runGit(rootDir, 'add', '--all')
  runGit(rootDir, 'commit', '--quiet', '-m', 'Add the stats')

  // What the Recycle Bin does: the file leaves the disk, git isn't told.
  await dropStats(stats, ['2026-09-27T15-12-31.json'], (path) => {
    rmSync(path)
  })

  assert.ok(
    runGit(rootDir, 'diff', '--cached', '--name-only').includes(
      'stats/general/data/2026-09-27T15-12-31.json'
    )
  )
  assert.equal(runGit(rootDir, 'diff', '--name-only', '--', 'stats'), '')
})

await test('dropStats takes a snapshot out, re-renders and stages the result', async () => {
  const rootDir = createGitRepo({ 'package.json': '{}', 'src/a.ts': 'x\n' })
  const stats = readStats(rootDir)
  await collectStats(stats, new Date('2026-09-27T15:12:31Z'))
  await collectStats(stats, new Date('2026-09-28T15:12:31Z'))
  await renderStats(stats)
  runGit(rootDir, 'add', '--all')
  runGit(rootDir, 'commit', '--quiet', '-m', 'Add the stats')

  // The route off Windows, here on every platform: the Windows one would send
  // a file to the real Recycle Bin on each test run.
  await dropStats(stats, ['2026-09-27T15-12-31.json'], (path) => {
    removeGitFile(rootDir, path)
  })

  assert.deepEqual(readdirSync(join(rootDir, 'stats/general/data')), [
    '2026-09-28T15-12-31.json',
  ])
  assert.deepEqual(await checkStats(stats), [])
  assert.deepEqual(
    runGit(rootDir, 'diff', '--cached', '--name-only')
      .split('\n')
      .filter((each) => each !== ''),
    [
      'stats/general/data/2026-09-27T15-12-31.json',
      'stats/general/graph/data.js',
      'stats/general/latest.md',
    ]
  )
})

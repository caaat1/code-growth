import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
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

await test('dropStats takes a snapshot out, re-renders and stages the result', async () => {
  const rootDir = createGitRepo({ 'package.json': '{}', 'src/a.ts': 'x\n' })
  const stats = readStats(rootDir)
  collectStats(stats, new Date('2026-09-27T15:12:31Z'))
  collectStats(stats, new Date('2026-09-28T15:12:31Z'))
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

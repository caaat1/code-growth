import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import { createGitRepo } from '../../test/helper/git/repo/create.js'
import { runGit } from '../git/run.js'
import { readGraphDataEntry } from '../graph/data/entry/read.js'
import { readGraphDataProject } from '../graph/data/project/read.js'
import { readGraphDataScope } from '../graph/data/scope/read.js'
import { findProjectRootDir } from '../project/root/dir/find.js'

import { checkStats } from './check.js'
import { collectStats } from './collect.js'
import { readStats } from './read.js'
import { renderStats } from './render.js'

const date = new Date('2026-09-27T15:12:31Z')

function createProject(): string {
  return createDir({ 'package.json': '{}', 'src/a.ts': 'x\ny\n' })
}

await test('renderStats writes nothing without snapshots', async () => {
  const stats = readStats(createProject())
  assert.equal(await renderStats(stats), 0)
  assert.equal(existsSync(stats.path.dir), false)
})

await test('renderStats writes latest.md, the graph data and the page into the project, titled by its folder', async () => {
  const rootDir = createProject()
  const stats = readStats(rootDir)
  await collectStats(stats, date)
  assert.equal(await renderStats(stats), 1)
  const graphData = readFileSync(stats.path.graphData, 'utf-8')
  assert.equal(readGraphDataProject(graphData), basename(rootDir))
  assert.equal(readGraphDataScope(graphData), 'src')
  assert.equal(readGraphDataEntry(graphData).length, 1)
  assert.ok(
    readFileSync(stats.path.latestMd, 'utf-8').startsWith(
      `# ${basename(rootDir)} stats\n`
    )
  )
  assert.ok(existsSync(join(stats.path.dir, 'graph.html')))
  assert.ok(existsSync(join(stats.path.dir, 'graph', 'script.js')))
})

await test('renderStats names each point by the commit that added its snapshot', async () => {
  const rootDir = createGitRepo({ 'package.json': '{}', 'src/a.ts': 'x\n' })
  const stats = readStats(rootDir)
  await collectStats(stats, date)
  runGit(rootDir, 'add', '--all')
  runGit(rootDir, 'commit', '--quiet', '-m', 'Take the first snapshot')
  await renderStats(stats)
  assert.match(
    readFileSync(stats.path.graphData, 'utf-8'),
    /"commit":"[0-9a-f]+ Take the first snapshot"/
  )
})

await test('renderStats writes every file in the style of a project with Prettier', async () => {
  // Inside this package, whose Prettier the temporary project then resolves.
  const rootDir = createDir(
    {
      '.prettierrc': '{ "semi": true, "tabWidth": 4 }',
      'package.json': '{}',
      'src/a.ts': 'x\n',
    },
    findProjectRootDir(import.meta.dirname)
  )
  const stats = readStats(rootDir)
  await collectStats(stats, date)
  await renderStats(stats)
  assert.match(
    readFileSync(join(stats.path.dir, 'graph', 'script.js'), 'utf-8'),
    /^const labels = raw\.map\(\(r\) => r\.t\);$/m
  )
  assert.match(readFileSync(stats.path.graphData, 'utf-8'), /;$/m)
  assert.match(
    readFileSync(join(stats.path.dir, 'graph.html'), 'utf-8'),
    /^ {4}<head>$/m
  )
  assert.deepEqual(await checkStats(stats), [])
})

await test('readStats takes the name the config states over the folder name', () => {
  const rootDir = createDir({
    'package.json': '{}',
    'stats/general/config.json': '{ "project": "named" }',
  })
  assert.equal(readStats(rootDir).project, 'named')
})

await test('readStats finds the project from a folder inside it, and takes another stats folder', () => {
  const rootDir = createProject()
  const stats = readStats(join(rootDir, 'src'), 'metric/size')
  assert.equal(stats.rootDir, rootDir)
  assert.equal(stats.path.data, join(rootDir, 'metric', 'size', 'data'))
})

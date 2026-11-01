import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import { readGraphDataEntry } from '../graph/data/entry/read.js'
import { readGraphDataProject } from '../graph/data/project/read.js'
import { readGraphDataScope } from '../graph/data/scope/read.js'

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

await test('readStats finds the project from a folder inside it, and takes another stats folder', () => {
  const rootDir = createProject()
  const stats = readStats(join(rootDir, 'src'), 'metric/size')
  assert.equal(stats.rootDir, rootDir)
  assert.equal(stats.path.data, join(rootDir, 'metric', 'size', 'data'))
})

import assert from 'node:assert/strict'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import type { Stats } from '../stats.js'

import { checkStats } from './check.js'
import { collectStats } from './collect.js'
import { readStats } from './read.js'
import { renderStats } from './render.js'

const date = new Date('2026-09-27T15:12:31Z')

async function createRenderedStats(): Promise<Stats> {
  const stats = readStats(
    createDir({ 'package.json': '{}', 'src/a.ts': 'x\ny\n' })
  )
  await collectStats(stats, date)
  await renderStats(stats)
  return stats
}

await test('checkStats finds nothing right after a render, and nothing without snapshots', async () => {
  assert.deepEqual(await checkStats(await createRenderedStats()), [])
  assert.deepEqual(
    await checkStats(readStats(createDir({ 'package.json': '{}' }))),
    []
  )
})

await test('checkStats reports a snapshot the graph data lacks', async () => {
  const stats = await createRenderedStats()
  await collectStats(stats, new Date('2026-09-28T15:12:31Z'))
  assert.ok(
    (await checkStats(stats)).includes(
      'graph/data.js holds 1 snapshot(s), data/ 2'
    )
  )
})

await test('checkStats reports an edited latest.md and an edited page file', async () => {
  const stats = await createRenderedStats()
  appendFileSync(stats.path.latestMd, '\nedited\n')
  appendFileSync(join(stats.path.dir, 'graph', 'script.js'), '\nedited()\n')
  assert.deepEqual(await checkStats(stats), [
    'latest.md differs from the newest snapshot in data/',
    "graph/script.js differs from this version's page",
  ])
})

await test('checkStats reports graph data naming another project or scope', async () => {
  const stats = await createRenderedStats()
  writeFileSync(
    stats.path.graphData,
    readFileSync(stats.path.graphData, 'utf-8')
      .replace(`const project = "${stats.project}"`, 'const project = "other"')
      .replace('const scope = "src"', 'const scope = "lib"')
  )
  assert.deepEqual(await checkStats(stats), [
    `graph/data.js does not name the project ${stats.project}`,
    'graph/data.js does not name the scope src',
  ])
})

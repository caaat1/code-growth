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

await test('checkStats finds nothing in a checkout whose folder is named otherwise', async () => {
  const stats = await createRenderedStats()
  const elsewhere = { ...stats, project: 'another-folder' }
  assert.deepEqual(await checkStats(elsewhere), [])
})

await test('checkStats holds the files to a name the config states', async () => {
  const stats = await createRenderedStats()
  const named = {
    ...stats,
    config: { ...stats.config, project: 'named' },
    project: 'named',
  }
  assert.deepEqual(await checkStats(named), [
    'graph/data.js does not name the project named',
    'latest.md differs from the newest snapshot in data/',
  ])
  await renderStats(named)
  assert.deepEqual(await checkStats(named), [])
})

await test('checkStats reports graph data naming no project', async () => {
  const stats = await createRenderedStats()
  writeFileSync(
    stats.path.graphData,
    readFileSync(stats.path.graphData, 'utf-8').replace(
      `const project = "${stats.project}"\n`,
      ''
    )
  )
  assert.ok(
    (await checkStats(stats)).includes(
      `graph/data.js does not name the project ${stats.project}`
    )
  )
})

await test('checkStats reports graph data naming another scope', async () => {
  const stats = await createRenderedStats()
  writeFileSync(
    stats.path.graphData,
    readFileSync(stats.path.graphData, 'utf-8').replace(
      'const scope = "src"',
      'const scope = "lib"'
    )
  )
  assert.deepEqual(await checkStats(stats), [
    'graph/data.js does not name the scope src',
  ])
})

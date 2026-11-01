import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import { findProjectRootDir } from '../project/root/dir/find.js'

import { collectSnapshot } from './collect.js'

const date = new Date('2026-09-27T15:12:31Z')

await test('collectSnapshot writes the snapshot it returns, its tallies only, into a data dir it creates', async () => {
  const rootDir = createDir({ 'src/a.test.ts': 'x\n', 'src/a.ts': 'x\ny\n' })
  const dataDir = join(rootDir, 'data')
  const measure = await collectSnapshot(
    { include: ['src'], test: ['**/*.test.ts'] },
    rootDir,
    dataDir,
    date
  )
  assert.deepEqual(measure, {
    test: { byte: 2, byteAllocated: 4096, directory: 0, file: 1, line: 1 },
    total: { byte: 6, byteAllocated: 8192, directory: 0, file: 2, line: 3 },
  })
  const written: unknown = JSON.parse(
    readFileSync(join(dataDir, '2026-09-27T15-12-31.json'), 'utf-8')
  )
  assert.deepEqual(written, measure)
  assert.deepEqual(Object.keys(written as object), ['test', 'total'])
})

await test('collectSnapshot refuses a config that matches no files', async () => {
  const rootDir = createDir({ 'src/a.ts': 'x\n' })
  await assert.rejects(
    collectSnapshot(
      { include: ['missing'] },
      rootDir,
      join(rootDir, 'data'),
      new Date()
    ),
    /No files match include \["missing"\]/
  )
})

await test('collectSnapshot writes in the style of a project with Prettier', async () => {
  // Inside this package, whose Prettier the temporary project then resolves.
  const rootDir = createDir(
    {
      '.prettierrc': '{ "tabWidth": 4 }',
      'package.json': '{}',
      'src/a.ts': 'x\n',
    },
    findProjectRootDir(import.meta.dirname)
  )
  const dataDir = join(rootDir, 'data')
  await collectSnapshot({ include: ['src'] }, rootDir, dataDir, date)
  assert.match(
    readFileSync(join(dataDir, '2026-09-27T15-12-31.json'), 'utf-8'),
    /^ {4}"test": \{$/m
  )
})

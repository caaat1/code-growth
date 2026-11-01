import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import { findProjectRootDir } from '../project/root/dir/find.js'

import { formatSource } from './format.js'

await test('formatSource follows the style of a project with Prettier', async () => {
  const rootDir = findProjectRootDir(import.meta.dirname)
  assert.equal(
    await formatSource(rootDir, join(rootDir, 'x.js'), 'const a   = "b";'),
    "const a = 'b'\n"
  )
})

await test('formatSource leaves the text alone in a project without Prettier', async () => {
  const rootDir = createDir({ 'package.json': '{}' })
  const source = 'const a   = "b";'
  assert.equal(
    await formatSource(rootDir, join(rootDir, 'x.js'), source),
    source
  )
})

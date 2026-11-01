import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import { findProjectRootDir } from '../project/root/dir/find.js'

import { loadPrettier } from './load.js'

await test('loadPrettier finds a project with Prettier installed', async () => {
  const prettier = loadPrettier(findProjectRootDir(import.meta.dirname))
  assert.equal(
    await prettier?.format('const a   = 1', { parser: 'babel' }),
    'const a = 1;\n'
  )
})

await test('loadPrettier gives nothing for a project without it', () => {
  assert.equal(loadPrettier(createDir({ 'package.json': '{}' })), undefined)
})

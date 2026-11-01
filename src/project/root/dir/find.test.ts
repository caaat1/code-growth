import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../../../test/helper/dir/create.js'

import { findProjectRootDir } from './find.js'

await test('findProjectRootDir finds the nearest ancestor holding package.json', () => {
  const rootDir = createDir({
    'package.json': '{}',
    'other/deep/file.txt': '',
    'tool/inner/deep/file.txt': '',
    'tool/inner/package.json': '{}',
  })
  assert.equal(findProjectRootDir(rootDir), rootDir)
  assert.equal(findProjectRootDir(join(rootDir, 'other', 'deep')), rootDir)
  assert.equal(
    findProjectRootDir(join(rootDir, 'tool', 'inner', 'deep')),
    join(rootDir, 'tool', 'inner')
  )
})

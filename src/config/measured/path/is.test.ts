import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../../../test/helper/dir/create.js'
import type { Config } from '../../../config.js'
import { findConfigEntry } from '../../entry/find.js'

import { isConfigMeasuredPath } from './is.js'

const config: Config = { exclude: ['src/skip'], include: ['src', 'lib/*.ts'] }

await test('isConfigMeasuredPath takes what include names, less what exclude does', () => {
  assert.equal(isConfigMeasuredPath(config, 'src/a.ts'), true)
  assert.equal(isConfigMeasuredPath(config, 'src/deep/er/a.ts'), true)
  assert.equal(isConfigMeasuredPath(config, 'lib/a.ts'), true)
  assert.equal(isConfigMeasuredPath(config, 'lib/deep/a.ts'), false)
  assert.equal(isConfigMeasuredPath(config, 'src/skip/a.ts'), false)
  assert.equal(isConfigMeasuredPath(config, 'other/a.ts'), false)
  assert.equal(isConfigMeasuredPath(config, 'package.json'), false)
})

await test('isConfigMeasuredPath leaves dotfiles out, like a scan', () => {
  assert.equal(isConfigMeasuredPath(config, 'src/.hidden/a.ts'), false)
  assert.equal(isConfigMeasuredPath(config, 'src/.a.yml'), false)
})

await test('isConfigMeasuredPath agrees with what a scan finds on disk', () => {
  const file = {
    'lib/a.ts': '',
    'lib/deep/b.ts': '',
    'other/c.ts': '',
    'src/.e.yml': '',
    'src/.hidden/d.ts': '',
    'src/a.ts': '',
    'src/skip/f.ts': '',
    'src/sub/b.ts': '',
  }
  const rootDir = createDir(file)
  const found = findConfigEntry(config, rootDir)
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(rootDir, join(entry.parentPath, entry.name))
        .split('\\')
        .join('/')
    )
    .sort()
  assert.deepEqual(
    Object.keys(file)
      .filter((path) => isConfigMeasuredPath(config, path))
      .sort(),
    found
  )
  assert.equal(readFileSync(join(rootDir, 'lib/a.ts'), 'utf-8'), '')
})

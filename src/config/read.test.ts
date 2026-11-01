import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import { scanMeasure } from '../measure/scan.js'

import { configDefault } from './default.js'
import { readConfig } from './read.js'

await test('readConfig gives the defaults without a file, and reads one that exists', () => {
  const rootDir = createDir({ 'config.json': '{ "include": ["lib"] }' })
  assert.equal(readConfig(join(rootDir, 'missing.json')), configDefault)
  assert.deepEqual(readConfig(join(rootDir, 'config.json')).include, ['lib'])
})

await test('the default test patterns take in test and spec files of any language', () => {
  const rootDir = createDir({
    'src/a.js': '',
    'src/a.spec.js': '',
    'src/a.test.ts': '',
    'src/latest.ts': '',
  })
  assert.equal(scanMeasure(configDefault, rootDir).test.file, 2)
})

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../../../test/helper/dir/create.js'

import { scanByteOnDisk } from './scan.js'

await test('scanByteOnDisk sums the blocks the files really take, in whole 512-byte units', () => {
  const size = { block: 512, noise: 65536 }
  const rootDir = createDir({})
  mkdirSync(join(rootDir, 'src'))
  writeFileSync(join(rootDir, 'src', 'noise.bin'), randomBytes(size.noise))
  const byteOnDisk = scanByteOnDisk({ include: ['src'] }, rootDir)
  assert.equal(byteOnDisk % size.block, 0)
  assert.ok(byteOnDisk >= size.noise, String(byteOnDisk))
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'

import { scanMeasure } from './scan.js'

await test('scanMeasure counts bytes, newlines, files and directories, skipping dotfiles and exclusions', () => {
  const rootDir = createDir({
    'other/c.ts': 'ignored\n',
    'src/.hidden/d.ts': 'hidden\n',
    'src/.e.yml': 'dotfile\n',
    'src/a.ts': 'x\ny\n',
    'src/skip/f.ts': 'excluded\n',
    'src/sub/b.ts': 'zé\n',
  })
  assert.deepEqual(
    scanMeasure({ exclude: ['src/skip/**'], include: ['src'] }, rootDir).total,
    { byte: 8, byteAllocated: 8192, directory: 1, file: 2, line: 3 }
  )
})

await test('scanMeasure tallies the tests apart and keeps them in the total, a test folder with its contents', () => {
  const rootDir = createDir({
    'src/a.test.ts': 'x\n',
    'src/a.ts': 'x\ny\n',
    'src/fixture/b.ts': 'x\ny\nz\n',
    'src/fixtures/c.ts': 'x\n',
  })
  assert.deepEqual(
    scanMeasure(
      { include: ['src'], test: ['**/*.test.ts', 'src/fixture'] },
      rootDir
    ),
    {
      test: { byte: 8, byteAllocated: 8192, directory: 1, file: 2, line: 4 },
      total: {
        byte: 14,
        byteAllocated: 16384,
        directory: 2,
        file: 4,
        line: 7,
      },
    }
  )
  assert.deepEqual(scanMeasure({ include: ['src'] }, rootDir).test, {
    byte: 0,
    byteAllocated: 0,
    directory: 0,
    file: 0,
    line: 0,
  })
})

await test('scanMeasure allocates each file whole 4 KiB units, an empty file none', () => {
  const size = { unit: 4096 }
  const rootDir = createDir({
    'src/empty.ts': '',
    'src/exact.ts': 'x'.repeat(size.unit),
    'src/over.ts': 'x'.repeat(size.unit + 1),
  })
  assert.deepEqual(scanMeasure({ include: ['src'] }, rootDir).total, {
    byte: 8193,
    byteAllocated: 12288,
    directory: 0,
    file: 3,
    line: 0,
  })
})

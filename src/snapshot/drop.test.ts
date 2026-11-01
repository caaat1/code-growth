import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'

import { dropSnapshot } from './drop.js'

await test('dropSnapshot recycles the named snapshots of data/ and refuses unknown ones', () => {
  const rootDir = createDir({
    'data/2026-10-06T15-34-17.json': '{}',
    'data/2026-10-07T09-00-00.json': '{}',
  })
  const dataDir = join(rootDir, 'data')
  const recycled: string[] = []
  const recycle = (path: string): void => {
    recycled.push(path)
  }
  assert.deepEqual(
    dropSnapshot({
      dataDir,
      name: ['stats/general/data/2026-10-06T15-34-17.json'],
      recycle,
    }),
    [join(dataDir, '2026-10-06T15-34-17.json')]
  )
  assert.deepEqual(recycled, [join(dataDir, '2026-10-06T15-34-17.json')])
  assert.throws(
    () =>
      dropSnapshot({ dataDir, name: ['2026-01-01T00-00-00.json'], recycle }),
    /No such snapshot/
  )
  assert.equal(recycled.length, 1)
})

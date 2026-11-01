import assert from 'node:assert/strict'
import { test } from 'node:test'

import { subtractTotal } from './subtract.js'

await test('subtractTotal takes a part out of a total, a count either lacks staying unknown', () => {
  assert.deepEqual(
    subtractTotal(
      { byte: 14, byteAllocated: 16384, directory: 2, file: 4, line: 7 },
      { byte: 8, byteAllocated: 8192, directory: 1, file: 2, line: 4 }
    ),
    { byte: 6, byteAllocated: 8192, directory: 1, file: 2, line: 3 }
  )
  assert.deepEqual(
    subtractTotal(
      { byte: 14, directory: 2, file: 4, line: 7 },
      { byte: 8, byteAllocated: 8192, file: 2, line: 4 }
    ),
    { byte: 6, file: 2, line: 3 }
  )
})

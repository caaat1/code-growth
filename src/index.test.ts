import assert from 'node:assert/strict'
import { test } from 'node:test'

import { version } from './index.js'

await test('version names the first release', () => {
  assert.equal(version, '0.1.0')
})

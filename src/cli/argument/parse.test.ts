import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseCliArgument } from './parse.js'

await test('parseCliArgument runs by default and takes a command', () => {
  assert.deepEqual(parseCliArgument([]), { command: 'run', snapshot: [] })
  for (const command of ['check', 'collect', 'pre-commit', 'render', 'run']) {
    assert.deepEqual(parseCliArgument([command]), { command, snapshot: [] })
  }
})

await test('parseCliArgument takes the stats folder beside any command', () => {
  assert.deepEqual(parseCliArgument(['render', '--dir', 'metric/size']), {
    command: 'render',
    dir: 'metric/size',
    snapshot: [],
  })
})

await test('parseCliArgument takes drop with the snapshots to drop, and refuses it without', () => {
  assert.deepEqual(parseCliArgument(['drop', 'a.json', 'b.json']), {
    command: 'drop',
    snapshot: ['a.json', 'b.json'],
  })
  assert.throws(() => parseCliArgument(['drop']), /names the snapshots/)
})

await test('parseCliArgument answers help and version before anything else', () => {
  assert.equal(parseCliArgument(['--help', 'nonsense']).command, 'help')
  assert.equal(parseCliArgument(['-h']).command, 'help')
  assert.equal(parseCliArgument(['--version']).command, 'version')
  assert.equal(parseCliArgument(['-v']).command, 'version')
})

await test('parseCliArgument refuses an unknown command, an unknown flag and a stray argument', () => {
  assert.throws(() => parseCliArgument(['nonsense']), /Unknown command/)
  assert.throws(() => parseCliArgument(['--nonsense']), /nonsense/)
  assert.throws(() => parseCliArgument(['render', 'x']), /takes no arguments/)
})

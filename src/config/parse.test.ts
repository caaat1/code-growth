import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { findProjectRootDir } from '../project/root/dir/find.js'

import { configDefault } from './default.js'
import { parseConfig } from './parse.js'

const path = 'stats/general/config.json'

await test('parseConfig fills what the file does not say from the defaults, and leaves $schema out', () => {
  assert.deepEqual(parseConfig('{}', path), configDefault)
  assert.deepEqual(
    parseConfig('{ "$schema": "x.json", "include": ["lib"] }', path),
    { ...configDefault, include: ['lib'] }
  )
  assert.deepEqual(parseConfig('{ "test": [] }', path).test, [])
})

await test('parseConfig refuses a key it does not know, naming the ones it takes', () => {
  assert.throws(
    () => parseConfig('{ "includes": ["src"] }', path),
    /stats\/general\/config\.json: unknown key "includes"; it takes exclude, include, project, test/
  )
})

await test('parseConfig refuses a value that is not a list of strings', () => {
  assert.throws(
    () => parseConfig('{ "include": "src" }', path),
    /"include" must be a list of strings/
  )
  assert.throws(
    () => parseConfig('{ "test": [1] }', path),
    /"test" must be a list of strings/
  )
})

await test('parseConfig takes a project name, and refuses one that is not a string', () => {
  assert.equal(parseConfig('{ "project": "x" }', path).project, 'x')
  assert.equal(parseConfig('{}', path).project, undefined)
  assert.throws(
    () => parseConfig('{ "project": ["x"] }', path),
    /"project" must be a string/
  )
})

await test('parseConfig refuses a file that is not a JSON object', () => {
  assert.throws(() => parseConfig('{ oops', path), /is not valid JSON/)
  for (const text of ['[]', '1', 'null']) {
    assert.throws(() => parseConfig(text, path), /must hold an object/)
  }
})

await test('the shipped schema describes the same keys parseConfig takes', () => {
  const schema = JSON.parse(
    readFileSync(
      join(findProjectRootDir(import.meta.dirname), 'schema', 'config.json'),
      'utf-8'
    )
  ) as { additionalProperties: boolean; properties: object }
  assert.equal(schema.additionalProperties, false)
  assert.deepEqual(Object.keys(schema.properties).sort(), [
    '$schema',
    'exclude',
    'include',
    'project',
    'test',
  ])
  for (const each of Object.keys(configDefault)) {
    assert.ok(Object.keys(schema.properties).includes(each), each)
  }
})

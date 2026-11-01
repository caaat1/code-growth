import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { findProjectRootDir } from '../src/project/root/dir/find.js'

import { deriveEntityName } from './helper/entity/name/derive.js'

const DECLARATION =
  /^export (?:async )?(const|function|interface|type) ([A-Za-z_$][\w$]*)/gm

// The entry points name no entity of their own; script.ts is on its way out.
const exemption = ['src/index.ts', 'src/script.ts']

const rootDir = findProjectRootDir(import.meta.dirname)
const path = globSync('src/**/*.ts', { cwd: rootDir })
  .map((each) => each.split('\\').join('/'))
  .filter((each) => !each.endsWith('.test.ts') && !exemption.includes(each))

await test('every exported entity is named by its path', () => {
  const mismatch = path.flatMap((each) =>
    [...readFileSync(join(rootDir, each), 'utf8').matchAll(DECLARATION)]
      .map(([, kind, declared]) => ({
        declared,
        expected: deriveEntityName(kind ?? '', each),
        path: each,
      }))
      .filter(({ declared, expected }) => declared !== expected)
  )
  assert.deepEqual(mismatch, [])
})

await test('the check above reads the entities it is meant to', () => {
  assert.ok(path.includes('src/total/subtract.ts'))
  assert.ok(
    [
      ...readFileSync(join(rootDir, 'src/total/subtract.ts'), 'utf8').matchAll(
        DECLARATION
      ),
    ].some(([, , declared]) => declared === 'subtractTotal')
  )
})

import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { mock, test } from 'node:test'

import { createDir } from '../../test/helper/dir/create.js'
import { createGitRepo } from '../../test/helper/git/repo/create.js'
import { runGit } from '../git/run.js'

import { runCli } from './run.js'

function createProject(): string {
  return createDir({ 'package.json': '{}', 'src/a.ts': 'x\ny\n' })
}

// The lines a run prints, and its exit code.
async function runCapturing(
  args: readonly string[],
  cwd: string
): Promise<{ code: number; line: readonly string[] }> {
  const line: string[] = []
  const capture = (text: unknown): void => {
    line.push(String(text))
  }
  const method = [
    mock.method(console, 'error', capture),
    mock.method(console, 'info', capture),
    mock.method(console, 'warn', capture),
  ]
  const code = await runCli(args, cwd)
  for (const each of method) {
    each.mock.restore()
  }
  return { code, line }
}

await test('a bare run takes a snapshot and renders, printing the page path', async () => {
  const rootDir = createProject()
  const { code, line } = await runCapturing([], rootDir)
  assert.equal(code, 0)
  assert.equal(readdirSync(join(rootDir, 'stats/general/data')).length, 1)
  assert.ok(existsSync(join(rootDir, 'stats/general/graph.html')))
  assert.ok(
    (line.at(-1) ?? '').includes(join(rootDir, 'stats/general/graph.html'))
  )
})

await test('collect only snapshots, and render only renders', async () => {
  const rootDir = createProject()
  assert.equal((await runCapturing(['collect'], rootDir)).code, 0)
  assert.equal(existsSync(join(rootDir, 'stats/general/graph.html')), false)
  assert.equal((await runCapturing(['render'], rootDir)).code, 0)
  assert.ok(existsSync(join(rootDir, 'stats/general/graph.html')))
  assert.equal(readdirSync(join(rootDir, 'stats/general/data')).length, 1)
})

await test('render without snapshots warns and succeeds', async () => {
  const { code, line } = await runCapturing(['render'], createProject())
  assert.equal(code, 0)
  assert.ok((line.at(-1) ?? '').includes('nothing to render'))
})

await test('check exits 0 when the page matches and 1 with what differs when it does not', async () => {
  const rootDir = createProject()
  await runCapturing([], rootDir)
  assert.equal((await runCapturing(['check'], rootDir)).code, 0)
  const other = createProject()
  await runCapturing(['collect'], other)
  const { code, line } = await runCapturing(['check'], other)
  assert.equal(code, 1)
  assert.ok(line.includes('graph/data.js holds 0 snapshot(s), data/ 1'))
})

await test('--dir keeps the stats in another folder', async () => {
  const rootDir = createProject()
  await runCapturing(['--dir', 'metric/size'], rootDir)
  assert.ok(existsSync(join(rootDir, 'metric/size/graph.html')))
  assert.equal(existsSync(join(rootDir, 'stats')), false)
})

await test('help and version print and succeed, a bad command exits 1 with why', async () => {
  const rootDir = createProject()
  const help = await runCapturing(['--help'], rootDir)
  assert.equal(help.code, 0)
  assert.ok((help.line[0] ?? '').startsWith('Usage: code-growth'))
  const version = await runCapturing(['--version'], rootDir)
  assert.equal(version.code, 0)
  assert.match(version.line[0] ?? '', /^\d+\.\d+\.\d+/)
  const bad = await runCapturing(['nonsense'], rootDir)
  assert.equal(bad.code, 1)
  assert.deepEqual(bad.line, ['Unknown command: nonsense'])
})

await test('a project with nothing to measure exits 1 with why', async () => {
  const rootDir = createDir({ 'package.json': '{}' })
  const { code, line } = await runCapturing(['collect'], rootDir)
  assert.equal(code, 1)
  assert.ok((line[0] ?? '').startsWith('No files match include'))
})

await test('pre-commit prints what it did and never blocks, whatever goes wrong', async () => {
  const rootDir = createGitRepo({ 'package.json': '{}', 'src/a.ts': 'x\n' })
  runGit(rootDir, 'add', '--', 'src/a.ts')
  const { code, line } = await runCapturing(['pre-commit'], rootDir)
  assert.equal(code, 0)
  assert.deepEqual(line, ['Stats snapshot taken and staged.'])

  const notRepo = createProject()
  const hiccup = await runCapturing(['pre-commit'], notRepo)
  assert.equal(hiccup.code, 0)
  assert.ok((hiccup.line[0] ?? '').startsWith('Stats skipped: '))

  const badConfig = createDir({
    'package.json': '{}',
    'stats/general/config.json': '{ "nonsense": [] }',
  })
  const bad = await runCapturing(['pre-commit'], badConfig)
  assert.equal(bad.code, 0)
  assert.match(bad.line[0] ?? '', /unknown key "nonsense"/)
})

await test('a bad config stops every other command, exit 1 with why', async () => {
  const rootDir = createDir({
    'package.json': '{}',
    'stats/general/config.json': '{ "nonsense": [] }',
  })
  const { code, line } = await runCapturing([], rootDir)
  assert.equal(code, 1)
  assert.match(line[0] ?? '', /unknown key "nonsense"/)
})

await test('drop refuses an unknown snapshot', async () => {
  const rootDir = createGitRepo({ 'package.json': '{}', 'src/a.ts': 'x\n' })
  const { code, line } = await runCapturing(
    ['drop', '2026-01-01T00-00-00.json'],
    rootDir
  )
  assert.equal(code, 1)
  assert.ok((line[0] ?? '').startsWith('No such snapshot'))
})

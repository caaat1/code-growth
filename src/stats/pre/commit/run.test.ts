import assert from 'node:assert/strict'
import { chmodSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { createGitRepo } from '../../../../test/helper/git/repo/create.js'
import { runGit } from '../../../git/run.js'
import { findProjectRootDir } from '../../../project/root/dir/find.js'
import { collectStats } from '../../collect.js'
import { readStats } from '../../read.js'
import { renderStats } from '../../render.js'

import { runStatsPreCommit } from './run.js'

const date = new Date('2026-09-27T15:12:31Z')

// A project with a first commit holding its source and nothing else.
function createProject(config = '{}'): string {
  const rootDir = createGitRepo({
    'README.md': 'x\n',
    'lib/a.ts': 'x\n',
    'package.json': '{}\n',
    'src/a.ts': 'x\n',
    'src/skip/a.ts': 'x\n',
    'stats/general/config.json': config,
  })
  runGit(rootDir, 'add', '--all')
  runGit(rootDir, 'commit', '--quiet', '-m', 'First')
  return rootDir
}

// A project whose first commit holds rendered stats too.
async function createProjectRendered(): Promise<string> {
  const rootDir = createProject()
  const stats = readStats(rootDir)
  collectStats(stats, date)
  await renderStats(stats)
  runGit(rootDir, 'add', '--all')
  runGit(rootDir, 'commit', '--quiet', '-m', 'Add the stats')
  return rootDir
}

function edit(rootDir: string, path: string): void {
  writeFileSync(join(rootDir, path), 'x\ny\n')
  runGit(rootDir, 'add', '--', path)
}

function readStaged(rootDir: string): string[] {
  return runGit(rootDir, 'diff', '--cached', '--name-only')
    .split('\n')
    .filter((each) => each !== '')
}

const later = new Date('2026-09-28T15:12:31Z')

await test('a commit staging what is measured gets a snapshot and the generated files staged, and nothing else', async () => {
  const rootDir = await createProjectRendered()
  edit(rootDir, 'src/a.ts')
  writeFileSync(join(rootDir, 'README.md'), 'unstaged\n')
  assert.equal(
    await runStatsPreCommit(readStats(rootDir), later),
    'Stats snapshot taken and staged.'
  )
  assert.deepEqual(readStaged(rootDir), [
    'src/a.ts',
    'stats/general/data/2026-09-28T15-12-31.json',
    'stats/general/graph/data.js',
    'stats/general/latest.md',
  ])
})

await test('the first snapshot stages the page along with it', async () => {
  const rootDir = createProject()
  edit(rootDir, 'src/a.ts')
  await runStatsPreCommit(readStats(rootDir), later)
  assert.deepEqual(readStaged(rootDir), [
    'src/a.ts',
    'stats/general/data/2026-09-28T15-12-31.json',
    'stats/general/graph.html',
    'stats/general/graph/data.js',
    'stats/general/graph/script.js',
    'stats/general/latest.md',
  ])
})

await test('what counts as measured comes from the config, not from a fixed src folder', async () => {
  const rootDir = createProject('{ "include": ["lib"] }')
  edit(rootDir, 'src/a.ts')
  assert.match(
    await runStatsPreCommit(readStats(rootDir), later),
    /stats snapshot skipped/
  )
  edit(rootDir, 'lib/a.ts')
  assert.equal(
    await runStatsPreCommit(readStats(rootDir), later),
    'Stats snapshot taken and staged.'
  )
})

await test('a staged file the config excludes takes no snapshot', async () => {
  const rootDir = createProject('{ "exclude": ["src/skip"] }')
  edit(rootDir, 'src/skip/a.ts')
  assert.match(
    await runStatsPreCommit(readStats(rootDir), later),
    /stats snapshot skipped/
  )
  assert.deepEqual(readStaged(rootDir), ['src/skip/a.ts'])
})

await test('a staged deletion of a measured file takes a snapshot', async () => {
  const rootDir = await createProjectRendered()
  runGit(rootDir, 'rm', '--quiet', '--', 'src/a.ts')
  assert.equal(
    await runStatsPreCommit(readStats(rootDir), later),
    'Stats snapshot taken and staged.'
  )
})

await test('a commit staging nothing measured takes no snapshot', async () => {
  const rootDir = createProject()
  edit(rootDir, 'README.md')
  assert.equal(
    await runStatsPreCommit(readStats(rootDir), later),
    'No staged measured or snapshot changes: stats snapshot skipped.'
  )
  assert.equal(
    readdirSync(join(rootDir, 'stats/general')).includes('data'),
    false
  )
})

await test('a commit only removing a snapshot re-renders from what is left', async () => {
  const rootDir = await createProjectRendered()
  const stats = readStats(rootDir)
  collectStats(stats, later)
  await renderStats(stats)
  runGit(rootDir, 'add', '--all')
  runGit(rootDir, 'commit', '--quiet', '-m', 'Second snapshot')
  runGit(
    rootDir,
    'rm',
    '--quiet',
    '--',
    'stats/general/data/2026-09-28T15-12-31.json'
  )
  assert.equal(
    await runStatsPreCommit(stats, new Date('2026-09-29T15:12:31Z')),
    'Stats re-rendered from the staged snapshots.'
  )
  assert.deepEqual(readStaged(rootDir), [
    'stats/general/data/2026-09-28T15-12-31.json',
    'stats/general/graph/data.js',
    'stats/general/latest.md',
  ])
})

await test('an unstaged change or an untracked snapshot in the data folder skips the step', async () => {
  const skip =
    'Stats skipped: stage or restore the snapshot changes in stats/general/data first.'
  const rootDir = await createProjectRendered()
  edit(rootDir, 'src/a.ts')
  const stats = readStats(rootDir)
  const snapshot = join(rootDir, 'stats/general/data/2026-09-30T15-12-31.json')
  writeFileSync(snapshot, '{ "total": { "byte": 1, "file": 1, "line": 1 } }\n')
  assert.equal(await runStatsPreCommit(stats, later), skip)
  assert.deepEqual(readStaged(rootDir), ['src/a.ts'])

  const other = await createProjectRendered()
  edit(other, 'src/a.ts')
  writeFileSync(
    join(other, 'stats/general/data/2026-09-27T15-12-31.json'),
    '{ "total": { "byte": 2, "file": 1, "line": 1 } }\n'
  )
  assert.equal(await runStatsPreCommit(readStats(other), later), skip)
})

await test('as a real pre-commit hook it puts the snapshot in the very commit, and a commit -a too', () => {
  const rootDir = createProject()
  const packageRootDir = findProjectRootDir(import.meta.dirname)
  const hook = join(rootDir, '.git', 'hooks', 'pre-commit')
  const node = process.execPath.split('\\').join('/')
  const loader = pathToFileURL(
    join(packageRootDir, 'node_modules', 'tsx', 'dist', 'loader.mjs')
  ).href
  const cli = join(packageRootDir, 'src', 'cli.ts').split('\\').join('/')
  // The test runner's tsx hands its children a tsconfig path relative to the
  // package, and the hook runs from the temporary project.
  const tsconfig = join(packageRootDir, 'tsconfig.test.json')
    .split('\\')
    .join('/')
  writeFileSync(
    hook,
    `#!/bin/sh\nTSX_TSCONFIG_PATH="${tsconfig}" "${node}" --import "${loader}" "${cli}" pre-commit\n`
  )
  chmodSync(hook, 0o755)

  edit(rootDir, 'src/a.ts')
  runGit(rootDir, 'commit', '--quiet', '-m', 'Change the source')
  const committed = runGit(rootDir, 'show', '--name-only', '--format=', 'HEAD')
  assert.match(committed, /src\/a\.ts/)
  assert.match(committed, /stats\/general\/data\/\d{4}-.*\.json/)
  assert.match(committed, /stats\/general\/graph\.html/)
  assert.equal(runGit(rootDir, 'status', '--short'), '')

  writeFileSync(join(rootDir, 'src/a.ts'), 'x\ny\nz\n')
  runGit(rootDir, 'commit', '--quiet', '--all', '-m', 'Change it again')
  assert.match(
    runGit(rootDir, 'show', '--name-only', '--format=', 'HEAD'),
    /stats\/general\/latest\.md/
  )
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { JSDOM } from 'jsdom'
import type { DOMWindow } from 'jsdom'

import { generateGraphData } from '../../src/graph/data/generate.js'
import { createGraphEntryList } from '../../src/graph/entry/list/create.js'
import { pageDir } from '../../src/page/dir.js'
import type { SnapshotFile } from '../../src/snapshot/file.js'

// Stands in for Chart.js, which needs a canvas; the instances stay reachable
// so a test can read what each chart was given.
const CHART_STUB = `
class Chart {
  static instances = {}
  static defaults = { interaction: {} }
  static register() {}
  static getChart() {}
  constructor(canvas, config) {
    this.data = config.data
    this.options = config.options
    this.scales = {}
    Chart.instances[canvas.id] = this
  }
  update() {}
  draw() {}
}
window.chartStub = Chart
`

const html = readFileSync(join(pageDir, 'graph.html'), 'utf-8')
const script = readFileSync(join(pageDir, 'graph', 'script.js'), 'utf-8')

const tally = {
  older: {
    test: { byte: 10, byteAllocated: 4096, directory: 0, file: 1, line: 2 },
    total: { byte: 100, byteAllocated: 8192, directory: 1, file: 2, line: 10 },
  },
  newer: {
    test: { byte: 20, byteAllocated: 4096, directory: 0, file: 1, line: 4 },
    total: { byte: 300, byteAllocated: 8192, directory: 1, file: 3, line: 30 },
  },
}

const snapshotFile: readonly SnapshotFile[] = [
  { filename: '2026-09-27T15-12-31.json', snapshot: tally.older },
  { filename: '2026-09-28T16-30-00.json', snapshot: tally.newer },
]

function loadPage(
  file: readonly SnapshotFile[] = snapshotFile,
  stored?: string
): DOMWindow {
  const { window } = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'http://localhost/',
  })
  if (stored !== undefined) {
    window.localStorage.setItem('code-growth:some-project:test', stored)
  }
  const inline = [...window.document.querySelectorAll('script:not([src])')]
    .map((each) => each.textContent)
    .join('\n')

  window.eval(
    [
      CHART_STUB,
      generateGraphData(createGraphEntryList(file), 'some-project', 'src, lib'),
      inline,
      script,
    ].join('\n')
  )
  return window
}

function readSummary(window: DOMWindow, id: string): string[][] {
  return [...(window.document.getElementById(id)?.querySelectorAll('tr') ?? [])]
    .map((row) => [...row.querySelectorAll('td')])
    .map((cell) => cell.map((each) => each.textContent))
}

function readInput(window: DOMWindow): HTMLInputElement {
  return window.document.getElementById('test') as HTMLInputElement
}

await test('the page names the project, the scope and the newest snapshot', () => {
  const { document } = loadPage()
  assert.equal(document.title, 'some-project stats')
  assert.equal(document.getElementById('project')?.textContent, 'some-project')
  assert.equal(document.getElementById('scope')?.textContent, 'src, lib')
  assert.equal(document.getElementById('asOf')?.textContent, '09/28 16:30')
})

await test('the page carries a favicon of its own, inline so its base href leaves it alone', () => {
  const { window } = loadPage()
  const href =
    window.document.querySelector('link[rel="icon"]')?.getAttribute('href') ??
    ''
  const prefix = 'data:image/svg+xml,'
  assert.ok(href.startsWith(prefix), href)
  const svg = new window.DOMParser().parseFromString(
    decodeURIComponent(href.slice(prefix.length)),
    'image/svg+xml'
  )
  assert.equal(svg.documentElement.tagName, 'svg')
  assert.equal(svg.querySelector('parsererror'), null)
  assert.ok(svg.querySelector('path') !== null)
})

await test('the summary shows the newest values with their trends, the tests in', () => {
  const window = loadPage()
  assert.equal(readInput(window).checked, true)
  assert.deepEqual(readSummary(window, 'summaryCount').at(0), [
    'byte',
    '300',
    '+200 ▲',
  ])
})

await test('unchecking the box leaves the tests out of the charts and the summary, and remembers it per project', () => {
  const window = loadPage()
  const input = readInput(window)
  input.checked = false
  input.dispatchEvent(new window.Event('change'))
  assert.deepEqual(readSummary(window, 'summaryCount').at(0), [
    'byte',
    '280',
    '+190 ▲',
  ])
  assert.equal(
    window.localStorage.getItem('code-growth:some-project:test'),
    'excluded'
  )
  const chartStub = (
    window as unknown as {
      chartStub: {
        instances: Record<
          string,
          { data: { datasets: { key: string; data: number[] }[] } }
        >
      }
    }
  ).chartStub
  assert.deepEqual(
    [
      ...(chartStub.instances['c0']?.data.datasets.find(
        (each) => each.key === 'bytes'
      )?.data ?? []),
    ],
    [90, 280]
  )
})

await test('a stored pick starts the page with the tests out', () => {
  const window = loadPage(snapshotFile, 'excluded')
  assert.equal(readInput(window).checked, false)
  assert.deepEqual(readSummary(window, 'summaryCount').at(0), [
    'byte',
    '280',
    '+190 ▲',
  ])
})

await test('the box is disabled while no snapshot tallies its tests apart', () => {
  const window = loadPage([
    {
      filename: '2026-09-27T15-12-31.json',
      snapshot: { total: { byte: 100, file: 2, line: 10 } },
    },
  ])
  const input = readInput(window)
  assert.equal(input.disabled, true)
  assert.equal(input.checked, true)
})

await test('a page with no snapshots says so', () => {
  const { document } = loadPage([])
  assert.equal(document.getElementById('asOf')?.textContent, 'no data yet')
})

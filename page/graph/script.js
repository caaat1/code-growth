const labels = raw.map((r) => r.t)

// Each point holds two tallies: withTest, and withoutTest (null for a
// snapshot taken before the tests were tallied apart). The checkbox picks
// the one every chart and table shows, and the browser remembers the pick
// per project.
const testToggle = document.getElementById('test')
const TEST_STORAGE_KEY = `code-growth:${project}:test`
const TEST_EXCLUDED = 'excluded'

const readTestIncluded = () => {
  try {
    return localStorage.getItem(TEST_STORAGE_KEY) !== TEST_EXCLUDED
  } catch {
    return true
  }
}

const storeTestIncluded = (isIncluded) => {
  try {
    if (isIncluded) {
      localStorage.removeItem(TEST_STORAGE_KEY)
    } else {
      localStorage.setItem(TEST_STORAGE_KEY, TEST_EXCLUDED)
    }
  } catch {
    // Without storage the page simply starts with the tests in.
  }
}

const hasTestTally = raw.some((r) => r.withoutTest !== null)
testToggle.disabled = !hasTestTally
testToggle.checked = !hasTestTally || readTestIncluded()

const readTally = (r) =>
  r === undefined ? undefined : testToggle.checked ? r.withTest : r.withoutTest
const readSeries = (key) => raw.map((r) => readTally(r)?.[key] ?? null)

const GRID = '#333'
const TICK = '#555'
const WIDTH_FILE = 4
const WIDTH_ENTRY = 1.5
const COUNT_DECIMALS = 0
const RATIO_DECIMALS = { byte: 0, bytePerLine: 1, line: 1 }

const TREND = {
  down: { arrow: '▼', className: 'down', sign: '−' },
  up: { arrow: '▲', className: 'up', sign: '+' },
}
const SUMMARY_TABLE = {
  summaryCount: [
    ['byte', 'bytes', COUNT_DECIMALS],
    ['byte allocated (nominal 4 KiB)', 'bytesAllocated', COUNT_DECIMALS],
    ['line', 'lines', COUNT_DECIMALS],
    ['file', 'files', COUNT_DECIMALS],
    ['entry', 'entries', COUNT_DECIMALS],
  ],
  summaryBytePerFile: [
    ['byte / file', 'bpf', RATIO_DECIMALS.byte],
    ['byte / entry', 'bpe', RATIO_DECIMALS.byte],
  ],
  summaryLinePerFile: [
    ['line / file', 'lpf', RATIO_DECIMALS.line],
    ['line / entry', 'lpe', RATIO_DECIMALS.line],
  ],
  summaryBytePerLine: [['byte / line', 'bpl', RATIO_DECIMALS.bytePerLine]],
}

const fmt = (n, decimals) =>
  n.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })

const renderSummary = () => {
  const last = readTally(raw.at(-1))
  const previous = readTally(raw.slice(0, -1).at(-1))
  for (const [bodyId, rows] of Object.entries(SUMMARY_TABLE)) {
    const body = document.getElementById(bodyId)
    body.replaceChildren()
    if (last === undefined || last === null) {
      continue
    }
    for (const [label, key, decimals] of rows) {
      const value = last[key]
      if (value === null) {
        continue
      }
      const row = body.insertRow()
      row.insertCell().textContent = label
      row.insertCell().textContent = fmt(value, decimals)
      const trendCell = row.insertCell()
      const before = previous?.[key]
      if (before === undefined || before === null || before === value) {
        continue
      }
      const trend = value > before ? TREND.up : TREND.down
      trendCell.className = trend.className
      trendCell.textContent = `${trend.sign}${fmt(Math.abs(value - before), decimals)} ${trend.arrow}`
    }
  }
}

renderSummary()

const tooltip = {
  callbacks: {
    footer: (items) => raw[items[0]?.dataIndex]?.commit ?? 'not committed yet',
  },
  footerFont: { family: 'monospace', weight: 'normal' },
}

const NEEDLE = '#666'
let needleIndex = null

const showNeedle = (index) => {
  if (index === needleIndex) {
    return
  }
  needleIndex = index
  for (const chart of Object.values(Chart.instances)) {
    chart.draw()
  }
}

Chart.register({
  id: 'needle',
  afterDatasetsDraw(chart) {
    if (needleIndex === null) {
      return
    }
    const x = chart.scales.x.getPixelForValue(needleIndex)
    const { bottom, top } = chart.chartArea
    const { ctx } = chart
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.lineWidth = 1
    ctx.strokeStyle = NEEDLE
    ctx.stroke()
    ctx.restore()
  },
})
Chart.defaults.interaction.mode = 'index'
Chart.defaults.interaction.intersect = true
Chart.defaults.onHover = (event, elements) => {
  showNeedle(elements[0]?.index ?? null)
}
for (const canvas of document.querySelectorAll('canvas')) {
  canvas.addEventListener('mouseleave', () => {
    showNeedle(null)
  })
}

const axisY = ({ position, color, text, grid, decimals }) => ({
  position,
  ticks: {
    color,
    font: { family: 'monospace', size: 10 },
    precision: decimals,
    format: {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    },
  },
  grid,
  title: { display: true, text, color, font: { size: 10 } },
})

const perFileEntryOpts = ({ file, entry, decimals }) => ({
  responsive: true,
  animation: false,
  plugins: {
    legend: {
      labels: { color: '#888', font: { family: 'monospace', size: 11 } },
    },
    tooltip,
  },
  scales: {
    x: {
      ticks: {
        color: TICK,
        font: { family: 'monospace', size: 10 },
        maxRotation: 45,
      },
      grid: { color: GRID },
    },
    y: axisY({
      position: 'right',
      ...file,
      grid: { drawOnChartArea: false },
      decimals,
    }),
    y1: axisY({ position: 'left', ...entry, grid: { color: GRID }, decimals }),
  },
})

new Chart(document.getElementById('c0'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'files',
        key: 'files',
        data: readSeries('files'),
        borderColor: '#4ec9b0',
        backgroundColor: '#4ec9b022',
        borderWidth: WIDTH_FILE,
        yAxisID: 'y',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'entries',
        key: 'entries',
        data: readSeries('entries'),
        borderColor: '#c586c0',
        backgroundColor: '#c586c022',
        borderWidth: WIDTH_ENTRY,
        yAxisID: 'y3',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'lines',
        key: 'lines',
        data: readSeries('lines'),
        borderColor: '#9cdcfe',
        backgroundColor: '#9cdcfe22',
        yAxisID: 'y1',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'bytes',
        key: 'bytes',
        data: readSeries('bytes'),
        borderColor: '#ce9178',
        backgroundColor: '#ce917822',
        yAxisID: 'y2',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'bytes allocated (nominal 4 KiB)',
        key: 'bytesAllocated',
        data: readSeries('bytesAllocated'),
        borderColor: '#ce9178',
        backgroundColor: '#ce917822',
        borderDash: [6, 3],
        yAxisID: 'y2',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  },
  options: {
    responsive: true,
    animation: false,
    plugins: {
      legend: {
        labels: { color: '#888', font: { family: 'monospace', size: 11 } },
      },
      tooltip,
    },
    scales: {
      x: {
        ticks: {
          color: TICK,
          font: { family: 'monospace', size: 10 },
          maxRotation: 45,
        },
        grid: { color: GRID },
      },
      y: axisY({
        position: 'left',
        color: '#4ec9b0',
        text: 'files',
        grid: { color: GRID },
        decimals: COUNT_DECIMALS,
      }),
      y3: axisY({
        position: 'left',
        color: '#c586c0',
        text: 'entries',
        grid: { drawOnChartArea: false },
        decimals: COUNT_DECIMALS,
      }),
      y1: axisY({
        position: 'right',
        color: '#9cdcfe',
        text: 'lines',
        grid: { drawOnChartArea: false },
        decimals: COUNT_DECIMALS,
      }),
      y2: axisY({
        position: 'right',
        color: '#ce9178',
        text: 'bytes',
        grid: { drawOnChartArea: false },
        decimals: COUNT_DECIMALS,
      }),
    },
  },
})

new Chart(document.getElementById('c1'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'bytes/entry',
        key: 'bpe',
        data: readSeries('bpe'),
        borderColor: '#c586c0',
        backgroundColor: '#c586c022',
        borderWidth: WIDTH_ENTRY,
        yAxisID: 'y1',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'bytes/file',
        key: 'bpf',
        data: readSeries('bpf'),
        borderColor: '#ce9178',
        backgroundColor: '#ce917822',
        borderWidth: WIDTH_FILE,
        yAxisID: 'y',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  },
  options: perFileEntryOpts({
    file: { color: '#ce9178', text: 'bytes/file' },
    entry: { color: '#c586c0', text: 'bytes/entry' },
    decimals: RATIO_DECIMALS.byte,
  }),
})

new Chart(document.getElementById('c2'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'lines/entry',
        key: 'lpe',
        data: readSeries('lpe'),
        borderColor: '#c586c0',
        backgroundColor: '#c586c022',
        borderWidth: WIDTH_ENTRY,
        yAxisID: 'y1',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'lines/file',
        key: 'lpf',
        data: readSeries('lpf'),
        borderColor: '#9cdcfe',
        backgroundColor: '#9cdcfe22',
        borderWidth: WIDTH_FILE,
        yAxisID: 'y',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  },
  options: perFileEntryOpts({
    file: { color: '#9cdcfe', text: 'lines/file' },
    entry: { color: '#c586c0', text: 'lines/entry' },
    decimals: RATIO_DECIMALS.line,
  }),
})

new Chart(document.getElementById('c3'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'bytes/line',
        key: 'bpl',
        data: readSeries('bpl'),
        borderColor: '#dcdcaa',
        backgroundColor: '#dcdcaa22',
        borderWidth: WIDTH_FILE,
        yAxisID: 'y',
        cubicInterpolationMode: 'monotone',
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  },
  options: {
    responsive: true,
    animation: false,
    plugins: {
      legend: {
        labels: { color: '#888', font: { family: 'monospace', size: 11 } },
      },
      tooltip,
    },
    scales: {
      x: {
        ticks: {
          color: TICK,
          font: { family: 'monospace', size: 10 },
          maxRotation: 45,
        },
        grid: { color: GRID },
      },
      y: axisY({
        position: 'left',
        color: '#dcdcaa',
        text: 'bytes/line',
        grid: { color: GRID },
        decimals: RATIO_DECIMALS.bytePerLine,
      }),
    },
  },
})

const isMissing = (value) => value === null || value === undefined

const det3 = ([[a, b, c], [d, e, f], [g, h, i]]) =>
  a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)

const fitQuadratic = (values) => {
  const points = values.flatMap((y, i) => (isMissing(y) ? [] : [[i, y]]))
  if (points.length < 3) {
    return values
  }
  const first = points[0][0]
  const last = points.at(-1)[0]
  const middle = (first + last) / 2
  const half = (last - first) / 2
  const power = [0, 0, 0, 0, 0]
  const moment = [0, 0, 0]
  for (const [i, y] of points) {
    const t = (i - middle) / half
    for (let k = 0; k < power.length; k += 1) {
      power[k] += t ** k
      if (k < moment.length) {
        moment[k] += t ** k * y
      }
    }
  }
  const normal = [
    [power[0], power[1], power[2]],
    [power[1], power[2], power[3]],
    [power[2], power[3], power[4]],
  ]
  const determinant = det3(normal)
  const [c0, c1, c2] = [0, 1, 2].map(
    (column) =>
      det3(
        normal.map((row, r) =>
          row.map((cell, c) => (c === column ? moment[r] : cell))
        )
      ) / determinant
  )
  return values.map((y, i) => {
    if (isMissing(y)) {
      return y
    }
    const t = (i - middle) / half
    return c0 + c1 * t + c2 * t * t
  })
}

const rawState = new WeakMap()

const showTrend = (chart, isOn) => {
  if (chart === undefined) {
    return
  }
  if (isOn) {
    const axes = Object.keys(chart.scales).filter((id) => id !== 'x')
    rawState.set(chart, {
      axes: axes.map((id) => [
        id,
        chart.options.scales[id].min,
        chart.options.scales[id].max,
      ]),
      datasets: chart.data.datasets.map((dataset) => [
        dataset.data,
        dataset.pointRadius,
        dataset.pointHoverRadius,
      ]),
      events: chart.options.events,
    })
    for (const id of axes) {
      chart.options.scales[id].min = chart.scales[id].min
      chart.options.scales[id].max = chart.scales[id].max
    }
    for (const dataset of chart.data.datasets) {
      dataset.data = fitQuadratic(dataset.data)
      dataset.pointRadius = 0
      dataset.pointHoverRadius = 0
    }
    chart.options.events = []
  } else {
    const state = rawState.get(chart)
    if (state === undefined) {
      return
    }
    for (const [id, min, max] of state.axes) {
      chart.options.scales[id].min = min
      chart.options.scales[id].max = max
    }
    chart.data.datasets.forEach((dataset, index) => {
      ;[dataset.data, dataset.pointRadius, dataset.pointHoverRadius] =
        state.datasets[index]
    })
    chart.options.events = state.events
    rawState.delete(chart)
  }
  chart.update('none')
}

for (const target of document.querySelectorAll('.trend')) {
  const canvas = target.closest('.card').querySelector('canvas')
  target.addEventListener('mouseenter', () => {
    showTrend(Chart.getChart(canvas), true)
  })
  target.addEventListener('mouseleave', () => {
    showTrend(Chart.getChart(canvas), false)
  })
}

// A pane showing its trend (the box toggled from the keyboard while the
// pointer rests on TREND) shows the trend of the new tally.
const showTestTally = () => {
  for (const chart of Object.values(Chart.instances)) {
    const isTrendShown = rawState.has(chart)
    showTrend(chart, false)
    for (const dataset of chart.data.datasets) {
      dataset.data = readSeries(dataset.key)
    }
    chart.update('none')
    if (isTrendShown) {
      showTrend(chart, true)
    }
  }
  renderSummary()
}

testToggle.addEventListener('change', () => {
  storeTestIncluded(testToggle.checked)
  showTestTally()
})

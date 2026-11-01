import { formatNumber } from '../number/format.js'

const TREND = {
  down: { arrow: '▼', sign: '−' },
  up: { arrow: '▲', sign: '+' },
} as const

/** The change from a previous value, blank when equal or unknown. */
export function formatTrend(
  current: number,
  previous: number | undefined,
  decimals = 0
): string {
  if (previous === undefined || current === previous) {
    return ''
  }
  const { arrow, sign } = current > previous ? TREND.up : TREND.down
  return `${sign}${formatNumber(Math.abs(current - previous), decimals)} ${arrow}`
}

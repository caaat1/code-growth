const DECIMAL_BASE = 10

export function divideRatio(
  dividend: number,
  divisor: number,
  decimals: number
): number {
  if (divisor === 0) {
    return 0
  }
  const factor = DECIMAL_BASE ** decimals
  return Math.round((dividend * factor) / divisor) / factor
}

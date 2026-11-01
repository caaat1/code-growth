export function formatNumber(number: number, decimals = 0): string {
  return number.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

import type { Total } from './total.js'

/**
 * What a scan measures: every entry it reaches, and the tests among them,
 * counted in the total and again on their own.
 */
export interface Measure {
  test: Total
  total: Total
}

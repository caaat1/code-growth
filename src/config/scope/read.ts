import type { Config } from '../../config.js'

/** What the config measures, in words the page's heading can show. */
export function readConfigScope(config: Config): string {
  return config.include.join(', ')
}

import type { Config } from '../config.js'

/** What a project gets for whatever its config.json doesn't say, or without one. */
export const configDefault: Config = {
  include: ['src'],
  exclude: [],
  test: ['**/*.spec.*', '**/*.test.*'],
}

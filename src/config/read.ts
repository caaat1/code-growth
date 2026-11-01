import { readFileSync } from 'node:fs'

import type { Config } from '../config.js'

import { configDefault } from './default.js'
import { parseConfig } from './parse.js'

/** The config at a path, or the defaults when there is no file. */
export function readConfig(path: string): Config {
  let text: string
  try {
    text = readFileSync(path, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return configDefault
    }
    throw error
  }
  return parseConfig(text, path)
}

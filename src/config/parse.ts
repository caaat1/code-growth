import type { Config } from '../config.js'

import { configDefault } from './default.js'

const LIST_KEY = ['exclude', 'include', 'test']

function isStringList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((each): boolean => typeof each === 'string')
  )
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${(error as Error).message}`, {
      cause: error,
    })
  }
}

/**
 * A config.json's text as a config, defaults filling what it doesn't say. A
 * key it doesn't know is refused rather than ignored, so a misspelled or
 * stale one can't silently change what gets measured.
 */
export function parseConfig(text: string, path: string): Config {
  const value = parseJson(text, path)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must hold an object`)
  }
  const { $schema: _schema, ...rest } = value as Record<string, unknown>
  for (const [key, each] of Object.entries(rest)) {
    if (!LIST_KEY.includes(key)) {
      throw new Error(
        `${path}: unknown key "${key}"; it takes ${LIST_KEY.join(', ')}`
      )
    }
    if (!isStringList(each)) {
      throw new Error(`${path}: "${key}" must be a list of strings`)
    }
  }
  return { ...configDefault, ...(rest as Partial<Config>) }
}

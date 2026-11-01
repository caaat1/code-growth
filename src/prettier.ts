import type { format, resolveConfig } from 'prettier'

/** The part of Prettier this tool uses. */
export interface Prettier {
  format: typeof format
  resolveConfig: typeof resolveConfig
}

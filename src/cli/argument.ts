import type { CliCommand } from './command.js'

export interface CliArgument {
  readonly command: CliCommand
  /** The stats folder, when it isn't the default. */
  readonly dir?: string
  /** The snapshots `drop` names. */
  readonly snapshot: readonly string[]
}

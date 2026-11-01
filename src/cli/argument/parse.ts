import { parseArgs } from 'node:util'

import type { CliArgument } from '../argument.js'
import type { CliCommand } from '../command.js'

const commandTaking: readonly CliCommand[] = [
  'check',
  'collect',
  'drop',
  'pre-commit',
  'render',
  'run',
]

function isCommand(word: string): word is CliCommand {
  return (commandTaking as readonly string[]).includes(word)
}

/** Reads the command line; an unknown command or flag throws. */
export function parseCliArgument(args: readonly string[]): CliArgument {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: [...args],
    options: {
      dir: { type: 'string' },
      help: { short: 'h', type: 'boolean' },
      version: { short: 'v', type: 'boolean' },
    },
  })
  if (values.help === true) {
    return { command: 'help', snapshot: [] }
  }
  if (values.version === true) {
    return { command: 'version', snapshot: [] }
  }
  const [command = 'run', ...snapshot] = positionals
  if (!isCommand(command)) {
    throw new Error(`Unknown command: ${command}`)
  }
  if (command === 'drop' && snapshot.length === 0) {
    throw new Error('drop names the snapshots to drop')
  }
  if (command !== 'drop' && snapshot.length > 0) {
    throw new Error(`${command} takes no arguments: ${snapshot.join(' ')}`)
  }
  return {
    command,
    ...(values.dir === undefined ? {} : { dir: values.dir }),
    snapshot,
  }
}

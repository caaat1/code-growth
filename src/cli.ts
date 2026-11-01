#!/usr/bin/env node
import { runCli } from './cli/run.js'

// process.argv is [node executable, this script's path, ...actual args].
const ARGV_SCRIPT_OFFSET = 2

process.exitCode = await runCli(
  process.argv.slice(ARGV_SCRIPT_OFFSET),
  process.cwd()
)

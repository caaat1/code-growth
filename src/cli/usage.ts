export const cliUsage = `Usage: code-growth [command] [--dir <folder>]

Commands:
  run                 Take a snapshot and render (the default)
  collect             Take a snapshot only
  render              Render latest.md and the page from the snapshots
  check               Report whether what's rendered matches the snapshots
  drop <snapshot>...  Take snapshots out of the history and re-render
  pre-commit          The Git hook's step: snapshot and stage, never blocking

Options:
  --dir <folder>      The stats folder, from the project root (default: stats/general)
  -h, --help          Show this
  -v, --version       Show the version
`

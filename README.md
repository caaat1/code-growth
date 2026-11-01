# code-growth

Track how a codebase grows. A Git hook takes one size snapshot per commit and keeps it in the repo, and a page plots the whole history, so every step in a curve points at the commit that made it.

Line counters tell you how big a project is today. code-growth tells you how it got there: when it doubled, whether files are getting bigger or just more numerous, and how much of it is tests.

## What it measures

Bytes, lines, files and entries (files plus folders), and the ratios between them: bytes per file, lines per file, bytes per line. Tests are tallied apart, so the page can show the history with or without them.

## Set up

It needs Node 22.17 or later and Git.

```sh
npm install --save-dev github:caaat1/code-growth
npx code-growth
```

npm notes that the package has a `prepare` script when it installs. That's the tool building itself, and there's nothing to do about it.

That takes a first snapshot of `src/` and prints the path of the page to open. Then add the hook, so each commit records itself. With [husky](https://typicode.github.io/husky/), add this line to `.husky/pre-commit`; without it, put the line in `.git/hooks/pre-commit`:

```sh
npx --no-install code-growth pre-commit || true
```

The step only acts when a commit stages something measured, stages exactly the files it writes, and never blocks a commit.

## What it keeps in your repo

Everything goes in `stats/general/`, and all of it is meant to be committed:

- `data/` holds one JSON file per snapshot, the only source for everything else.
- `latest.md` shows the newest snapshot as tables, with the change since the one before.
- `graph.html` is the page; open it from disk, with nothing installed. Hovering a point shows its commit.
- `graph/` holds what the page loads.
- `config.json` is yours, and optional.

The page loads Chart.js from jsDelivr, so viewing it needs a network connection.

## Configure

Without a `config.json` it measures `src/`. To change that:

```json
{
  "$schema": "../../node_modules/code-growth/schema/config.json",
  "include": ["src", "lib/**/*.ts"],
  "exclude": ["src/generated"],
  "test": ["**/*.test.*", "**/*.spec.*", "src/fixture"]
}
```

Every key is optional, and an unknown key is an error rather than silently ignored. Patterns are relative to the project root, which is the nearest folder holding a `package.json`. A bare folder takes in everything inside it. Dotfiles and dot-folders are always left out.

## Commands

| Command                      | What it does                                                  |
| ---------------------------- | ------------------------------------------------------------- |
| `code-growth`                | Take a snapshot and render                                    |
| `code-growth collect`        | Take a snapshot only                                          |
| `code-growth render`         | Render `latest.md` and the page from the snapshots            |
| `code-growth check`          | Exit 1 if what's rendered doesn't match the snapshots, for CI |
| `code-growth drop <file>...` | Take snapshots out of the history, re-render and stage        |
| `code-growth pre-commit`     | The hook's step                                               |

Any of them takes `--dir <folder>` to keep the stats somewhere other than `stats/general`.

`drop` sends a snapshot to the Recycle Bin on Windows. Elsewhere it uses `git rm`, so it only takes a tracked snapshot, which Git can bring back.

## Prettier

If your project has Prettier, generated files follow your config, so regenerating them doesn't break your format check. Without it they're written as they are. Prettier is an optional peer dependency.

## Use it from code

```ts
import { collectStats, readStats, renderStats } from 'code-growth'

const stats = readStats(process.cwd())
await collectStats(stats, new Date())
await renderStats(stats)
```

## Code layout

The source follows its author's path grammar, which makes every name derivable from where it sits, and [a test](test/name.test.ts) holds it to that:

- Every folder and file below `src/` gives a word to the name, from the general to the specific: `src/snapshot/file.ts` is `SnapshotFile`.
- A function leads with its verb, the file's own name: `src/total/subtract.ts` is `subtractTotal`.
- `(x)/y` reads "y is an x", so `latest/md/(heading)/count.ts` is a kind of heading. A plain `x/y` belongs to x.
- Each test sits beside what it tests, as `x.test.ts`.

The package's exports hide all of this from anyone only using it.

## License

[MIT](LICENSE)

// @ts-check
import { defineConfig } from 'eslint/config'

import { eslintConfigStrict } from './eslint.config/(array)/strict.mjs'

/**
 * Flat ESLint config entry point. All composition — global ignores, base
 * rules, and the `eslint.config/` self-linting layer (`(object)/self.mjs`)
 * — lives in `eslint.config/(array)/strict.mjs`; this file just hands that
 * array to `defineConfig`. There's no auto-discovery for that in flat
 * config, so a module left unwired simply falls outside ESLint's
 * configured scope — loudly, at the CLI: linting a target matched by zero
 * `files` entries is a hard error, not a silent no-op.
 *
 * `eslint.relaxed.config.mjs` is the analogous entry point for
 * `eslintConfigRelaxed` (`(array)/(strict)/relaxed.mjs`), selected via the
 * `lint:src:relaxed` npm script rather than automatically — see
 * `(object)/relaxation.mjs` for why that's a workflow-stage choice
 * and which rules it loosens.
 *
 * ## The `lint:*` script grammar (package.json)
 *
 * `lint` is the base: it holds every shared invariant (cache, format,
 * `--no-warn-ignored`, `--max-warnings 0`) but no target. `lint:src` and
 * `lint:self` each pin `lint` to one target; every other variant derives
 * from its target parent by exactly one appended flag: `:fix` appends
 * `--fix`, `:no-cache` appends `--no-cache` (composable in that order, e.g.
 * `lint:src:fix:no-cache`). npm forwards args after `--` to the end of the
 * referenced script line, which is what lets the chain compose. `:relaxed`
 * is the one exception — it appends `--config eslint.relaxed.config.mjs`
 * to swap the whole config file rather than a single CLI flag, since
 * relaxing rules means selecting a different `defineConfig` array, not
 * toggling ESLint's own behavior.
 *
 * Why `:no-cache` must exist: `--cache` assumes a file's lint result
 * depends only on that file's content. Type-aware rules break that
 * assumption — editing file B can change violations in untouched file A,
 * whose stale cache entry still says "clean". Incremental runs (`lint:src`,
 * `lint:src:fix`) are the fast daily path; the `:no-cache` variants are
 * ground truth for when the cache may be lying (after refactors, config or
 * plugin changes). Only `lint:src` has a `:no-cache` sibling — `lint:self`'s
 * two-file target makes cache staleness a non-issue there.
 */

export default defineConfig(eslintConfigStrict)

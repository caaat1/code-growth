# code-growth

Track how a codebase grows: one size snapshot per commit, kept in the repo, with a page of trends.

## Commands

- `npm run validate` — type-check + lint + format check + tests; must pass before push
- `npm test` — the tests alone (they sit beside their entities, `x.test.ts`; helpers in `test/helper/`)
- `npm run build` — `dist/`, what ships with `page/` and `schema/`

## Conventions

- Names and folders follow the path grammar described in the README's "Code layout": every name derives from its path, general to specific.
- Generic type parameters use a `T_` prefix (`T_Name`, not `TName`).
- Files and directories starting with `-` are temporary: git-ignored and excluded from tsconfig.
- Keep JSON keys and config lists in ASCII order (`&` < `*` < `-` < `.` < digits < uppercase < lowercase) unless order is load-bearing.
- `verbatimModuleSyntax` is on — use `import type` for type-only imports.
- `moduleDetection: "force"` — every file is a module; global augmentations must use `declare global {}`.

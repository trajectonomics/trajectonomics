# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to
`apps/data`, the private data-collection app tree under `apps/data/collector`.

## Rules

1. Stats only leave the machine. The collector prints plan, model, UTC bucket and numbers; it
   never prints or commits prompts, session titles, project names, paths, account ids or times of
   day. Never commit a real log, a real collector output or a hostname.
2. `apps/data/collector/src/extract/` and `src/aggregate.ts` are pure: data in, data out, no `fs`,
   no SQLite, no network, no clock. File and database access stays in `src/cli.ts`,
   `src/collect.ts` and `src/stores/`.
3. Every test fixture is synthetic and hand-written. Never copy a line from a real store into a
   test, a doc, a commit message or a pull request.
4. No prices in slice 1. A price enters the plan table only with a dated public source, in a later
   slice.
5. Cursor is counted from exactly one source per run: its SDK store when `usage_json` is populated,
   else the T3 Code `cursor` logs. Never both.

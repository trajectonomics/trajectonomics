# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/web`, the Dashboard: a read-only static web app that renders a Snapshot of `traj --json` results.

## Rules

1. The CLI is the only source of figures. The Dashboard never imports a core to compute, never does arithmetic on money, and shows the CLI's decimal strings as they are ([ADR 0002](docs/adr/0002-the-cli-is-the-only-source-of-figures.md)). A string may be parsed to a number only to place a mark on a chart.
2. `src/lib/` is pure: data in, data out, no I/O, no clock, no `Date`, no `process`. Spawning `traj`, reading and writing files, and the command line live in `scripts/`. The browser (storage, the address bar, `fetch`) and the React hooks over it live in `src/client/`. The Snapshot plan (`src/lib/snapshot/`) emits read leaves only, and `leaves.test.ts` pins that allowlist.
3. Dates come from the caller (`--as-of`, `--horizon`), never from the machine ([cli ADR 0029](../cli/docs/adr/0029-reads-take-their-date-from-the-caller.md)).
4. The Dashboard is a checkout tool. Do not add hosting, a Worker, a `wrangler.jsonc`, a deploy job or anything under `.github/` without the owner. It runs on `127.0.0.1` ([ADR 0004](docs/adr/0004-no-server-and-no-hosting.md)).
5. The contract in `src/lib/contract/` follows `traj schema <leaf> --json`. Take every field from that output, never from memory. A change in the CLI's output must fail `scripts/contract.test.ts`, which builds a ledger with the workspace `traj` binary.
6. Done means `bun run check` passes in `apps/web`: Biome lint with zero warnings, strict typecheck, tests, and the Astro build. Do not loosen `tsconfig.base.json`, `biome.json` or the shared config to make an error go away.
7. Keep to the vocabulary in [GLOSSARY.md](GLOSSARY.md). A Snapshot is not a "backend response", and a Read is not a "fetch".
8. Subagents do the work on a work model: **`deepseek-v4.1-flash`** (Pi). The expensive models (`claude-*`, `gemini-*`) are for consultation and review only.

---
status: accepted
---

# `traj dashboard` serves the Dashboard on loopback

ADR 0004 said the Dashboard has no server of its own and that a way for a person outside a checkout to open it was the owner's decision. The owner made it on 2026-11-22: the CLI starts it. [cli ADR-0041](../../../cli/docs/adr/0041-traj-dashboard-serves-the-dashboard-on-loopback.md) records the command; this ADR records what changes in this package.

- `bun run build` packs `dist/` into `pack/dashboard.bin` (`scripts/pack.ts`, format in `scripts/pack-format.ts`), the one file the compiled `traj` embeds.
- `scripts/serve.ts`, exported as `@trajectonomics/web/serve`, is the loopback server: it runs the Snapshot Plan against a `traj` command (`RunContext` gained a `prefix`, so a checkout's `bun src/index.ts` works), then serves the packed pages and the Snapshot at `/snapshot.json` on `127.0.0.1`. Which file answers a path, its type and the Host check are pure, in `src/lib/serve/route.ts`.
- The package no longer lists `@trajectonomics/cli`; `@trajectonomics/cli` lists this package. The contract test still runs the workspace binary, ordered by `apps/web/turbo.json`.

Still not here: hosting, a Worker, a deploy job, or any server that listens beyond `127.0.0.1`. `bun run dashboard` stays as the checkout's way to preview a fresh build.

## Consequences

- ADR 0004 holds for hosting; its "no server" clause is replaced by this loopback server inside the CLI.
- A change to `src/lib/serve/` or `scripts/serve.ts` is a change to a published binary's behaviour, so it ships with a CLI release.

# Dashboard

A read-only web app that shows what `traj` already computed. It reads one Snapshot, a JSON document made only of `traj … --json` results, and renders it on `127.0.0.1`. It never does arithmetic on money and never sends anything anywhere.

Requires a checkout of this repository and [Bun](https://bun.sh). The `traj` binary is built from this workspace.

```sh
bun install
bunx turbo run build --filter=@trajectonomics/cli   # builds apps/cli/dist/traj
bun run dashboard -- --as-of 2026-10-31 --horizon 2060-12-31 --birth-date 1990-05-15 --age 45 --age 60
```

`dashboard` builds the pages, writes the Snapshot to `dist/snapshot.json` from your own ledger (`TRAJ_HOME`, or `~/.traj`), and previews on `127.0.0.1`. Run it again to see new figures.

## Commands

| Command | What it does |
|---|---|
| `bun run snapshot -- --as-of DATE --horizon DATE [--scenario NAME]... [--compare A B] [--birth-date DATE] [--age N]... [--monthly] [--carry-in PATH] [--traj PATH] [--out FILE]` | Runs the Plan and writes a Snapshot. `traj` is taken from `--traj`, then `TRAJ_BINARY_PATH`, then `PATH`. |
| `bun run demo` | Builds a fictional ledger in a temporary directory and rewrites `public/demo/snapshot.json`, the committed Demo snapshot. |
| `bun run dashboard -- …` | Builds the pages, writes `dist/snapshot.json` with the same flags as `snapshot`, and previews. |
| `bun run check` | Lint, typecheck, tests and the build. |

## Where it lives

- `src/lib/contract/`: strict schemas for each read leaf, written from `traj schema <leaf> --json`.
- `src/lib/snapshot/`: the pure Plan, which decides the argv and assembles the Snapshot.
- `scripts/`: the I/O: spawning `traj`, reading the ledger for the demo, writing files.
- `docs/adr/` and [GLOSSARY.md](GLOSSARY.md): why it is shaped this way, and its words.

The pages arrive in the next change. For now `src/pages/index.astro` only shows that the build and the brand theme work.

## Licence

MIT. Not published to npm, and not hosted.

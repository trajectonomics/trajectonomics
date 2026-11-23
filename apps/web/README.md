# Dashboard

A web app that shows what `traj` already computed, and changes a plan through `traj` when the person asks. It reads one Snapshot, a JSON document made only of `traj … --json` results, and renders it on `127.0.0.1`. It never does arithmetic on money and never sends anything anywhere. Its only writes are Edits, each one a `traj` command run by the server on `127.0.0.1`.

With `traj` installed, no checkout is needed: `traj dashboard --as-of 2026-10-31 --horizon 2060-12-31` reads your ledger and serves the Dashboard on `http://127.0.0.1:4321/` until Ctrl-C (it ships in `traj` 0.5.0; [ADR 0007](docs/adr/0007-traj-dashboard-serves-the-dashboard-on-loopback.md)). The rest of this page is for working on the Dashboard from a checkout.

Requires a checkout of this repository and [Bun](https://bun.sh). The `traj` binary is built from this workspace. The pages are Svelte 5 on SvelteKit, built as static files ([ADR 0006](docs/adr/0006-svelte-5-on-sveltekit-replaces-astro-and-react.md)).

```sh
bun install
bunx turbo run build --filter=@trajectonomics/cli   # builds apps/cli/dist/traj
bun run dashboard -- --as-of 2026-10-31 --horizon 2060-12-31 --birth-date 1990-05-15 --age 45 --age 60
```

`dashboard` builds the pages with Vite, writes the Snapshot to `dist/snapshot.json` from your own ledger (`TRAJ_HOME`, or `~/.traj`), and previews on `127.0.0.1:4321`. Run it again to see new figures.

## Commands

| Command | What it does |
|---|---|
| `bun run snapshot -- --as-of DATE --horizon DATE [--scenario NAME]... [--compare A B] [--birth-date DATE] [--age N]... [--monthly] [--carry-in PATH] [--return-model PATH --paths N --seed HEX] [--traj PATH] [--out FILE]` | Runs the Plan and writes a Snapshot. `traj` is taken from `--traj`, then `TRAJ_BINARY_PATH`, then `PATH`. |
| `bun run demo` | Builds a fictional ledger in a temporary directory and rewrites `public/demo/snapshot.json`, the committed Demo snapshot. |
| `bun run dashboard -- …` | Builds the pages, writes `dist/snapshot.json` with the same flags as `snapshot`, and previews with `vite preview`. |
| `bun run build` | Builds the pages into `dist/` and packs them into `pack/dashboard.bin`, the file `traj dashboard` embeds. |
| `bun run check` | Lint, typecheck (`svelte-check` with warnings as errors), tests (including the Svelte guard) and the build. |

## Where it lives

- `src/lib/contract/`: strict schemas for each read leaf, written from `traj schema <leaf> --json`.
- `src/lib/snapshot/`: the pure Plan, which decides the argv and assembles the Snapshot.
- `scripts/`: the I/O: spawning `traj`, reading the ledger for the demo, writing files, packing the build, and the loopback server `traj dashboard` runs (`serve.ts`, exported as `@trajectonomics/web/serve`).
- `src/lib/serve/`: the server's pure rules: which packed file answers a path, its type, and the Host check.
- `src/lib/edit/`: the Edits, a closed list, each mapped to one `traj` write, and the guards of the write path.
- `src/lib/view/`, `src/lib/format/`, `src/lib/chart/`: pure functions from a Snapshot to what a page shows, the formatting of the CLI's strings, and the chart geometry.
- `src/client/`: the browser: storage, the address bar, `fetch`, and the Svelte modules (`.svelte.ts`) that hold the reactive state over them.
- `src/routes/`: one `+page.svelte` per route, and the root layout (the shell, prerendered as static files).
- `src/lib/view/plan-items/`: the planner pages' view models, pure: their cards, their drafts and what a save sends. `src/components/plan-items/` and `src/components/ui/Drawer.svelte` render them.
- `src/components/`: the Svelte components: `ui/` (shared), `chart/`, `shell/`, `net-worth/` and `pages/`.
- `src/styles/`: the brand's CSS.
- `scripts/svelte/`: the preload that lets `bun test` render components, and the test stand-in for SvelteKit's `$app` modules.
- `docs/adr/` and [GLOSSARY.md](GLOSSARY.md): why it is shaped this way, and its words.

## Pages

Overview, Net worth, Ledger, Projection, Milestones, Income, Expenses, Assets and debts, FI date, Compare, Tax allowances, Chance of success, Tax and Health. Income, Expenses and Assets and debts list the selected plan's items and, with the server running, edit them in a drawer: each save is one `traj` Edit ([ADR 0008](docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)). Assets and debts also adds a home or car, bought or owned already, financed, kept, let and sold, as one form ([ADR 0011](docs/adr/0011-a-real-asset-is-one-form-and-one-card-over-parts-the-cli-already-has.md)). Tax allowances (under Optimize, listed when the plan has a Levy) states how much more RMF, ThaiESG and the other retirement allowances could take each tax year and the tax that would save, then tries a year on the whole plan as a what-if or adds it with one Edit ([ADR 0012](docs/adr/0012-the-tax-allowances-page-reads-what-traj-says-each-allowance-could-take.md)). Add `?demo=1` to any address to see the Demo snapshot instead of your own, for example after `bun run build && bunx vite preview --host 127.0.0.1`. The Scenario a page shows and the nominal or real choice live in the address bar, so a view is a link.

## Edits

The plan switcher in the side navigation can copy a plan ("Copy plan", which asks for a name) and delete one ("Delete plan", which asks first). Each runs `traj scenario fork` or `traj scenario rm` through the server, dry first, and then shows the new Snapshot. The controls appear only when `traj dashboard` answers the page's token, so they are hidden in the Demo snapshot and under `bun run dashboard`, which has no server. The rules of the write path are in [ADR 0008](docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md).

## Licence

MIT. Not published to npm, and not hosted.

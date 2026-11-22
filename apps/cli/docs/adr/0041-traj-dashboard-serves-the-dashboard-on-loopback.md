# `traj dashboard` serves the Dashboard on loopback until it is stopped

The Dashboard (`apps/web`) renders a Snapshot: one JSON document made only of `traj … --json` reads. Until now a person got it by cloning the repository and running `bun run dashboard`, which nobody outside a checkout can do. The owner asked for the CLI to start it.

`traj dashboard --as-of DATE --horizon DATE` binds its port first (so a taken port fails before any read runs), reads the Snapshot by running this same build's read leaves as child processes (the compiled binary runs itself; a checkout runs `bun src/index.ts`), then serves the Dashboard's pages and that Snapshot on `127.0.0.1` (port 4321, or `--port`; `--port 0` lets the system pick) until SIGINT or SIGTERM. It then prints one result: the URL, the As-of, the horizon, how many reads ran, and the command of each read that failed. Its flags are the snapshot runner's: `--scenario` (repeatable), `--compare` (twice), `--birth-date`, `--age` (repeatable), `--monthly`, `--carry-in`.

The pages are embedded in the binary. `apps/web`'s build packs `dist/` into one file, `pack/dashboard.bin` (every file in base64 in one JSON document), and `@trajectonomics/web/serve` imports it with `{ type: "file" }`, which `bun build --compile` embeds. So `@trajectonomics/cli` now has `@trajectonomics/web` as a dev dependency, and `apps/web` no longer lists the CLI: its contract test still runs the workspace binary, through an explicit turbo task dependency on `@trajectonomics/cli#build` (`apps/web/turbo.json`), which keeps the task graph acyclic.

## Rules this leaf follows, and the one it bends

- **Reads only.** The Snapshot Plan emits read leaves only (`apps/web` `leaves.test.ts`), so `dashboard` changes nothing in the ledger.
- **Dates from the caller** (ADR-0029): `--as-of` and `--horizon` are required; nothing reads the clock.
- **Failures are this CLI's envelopes.** A stage-one read that fails (no ledger, a busy database) stops the command with that read's own code, message and hint. A later read that fails stays in the Snapshot as its error envelope and is listed in `failedReads`. A port that cannot be bound is `invalid_input` on `--port`.
- **One progress line on stderr.** ADR-0040 rejected stderr lines for a successful command, because they cannot be captured. This leaf's result can only be printed once the server stops, so while it runs it writes one line, `The Dashboard is on <url> . Press Ctrl-C to stop.`, through the context's `notify`. The URL is also in the result, so nothing is only on stderr.
- **Only this machine.** The server binds `127.0.0.1`, answers only GET and HEAD, and refuses any request whose Host header is not `127.0.0.1`, `localhost` or `[::1]` on its port, so a web page that rebinds its domain to 127.0.0.1 cannot read the Snapshot. Every response is `no-store`, `nosniff`, `same-origin` for cross-origin reads and `DENY` for frames.

## Considered options

- **Write the Snapshot to a file and tell the person to open the hosted Dashboard.** Rejected: hosting is the owner's decision, and a ledger's figures would leave the machine.
- **Compute the Snapshot in-process instead of spawning reads.** Rejected: the Snapshot's contract is the `--json` output of each leaf (apps/web ADR 0001), and running the leaves keeps it byte-for-byte that.
- **Download the pages from the release on first run.** Rejected: it adds a network fetch and a release asset to keep in step, for about 0.7 MB the binary can carry.
- **Embed each built file with its own import.** Rejected: it needs a generated module of imports; one packed file needs none.

## Consequences

- The binary grows by about 0.7 MB.
- Building the CLI needs `apps/web` built first. Turbo orders it (`^build`), and `binaries.yml` already builds `@trajectonomics/cli^...` before it compiles, which now includes `apps/web`.
- `bun test` in `apps/cli` without `apps/web`'s build fails only the end-to-end `dashboard` test, with "This build of traj carries no Dashboard pages".
- Turbo's `--affected` follows the package graph, where `apps/web` no longer depends on the CLI. So a pull request that touches only `apps/cli` does not run `apps/web`'s full contract test (it runs on the push to main, and on any pull request that touches `apps/web`). The CLI's own end-to-end `dashboard` test parses the Snapshot it serves with the strict Snapshot schema, so a change in a non-projection read's `--json` output still fails the pull request.
- `tooling/release/packages.json` lists `apps/web` as an extra path of the CLI, so a Dashboard-only change is released.
- `scripts/smoke.sh` starts `dashboard` on each POSIX release binary and fetches a page and the Snapshot. The Windows path (Ctrl-C through the launcher, where Node ends the child outright) is not smoke-tested.
- The desktop app (#67) can run the same code path through a sidecar.

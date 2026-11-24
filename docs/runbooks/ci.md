# CI runbook

`.github/workflows/ci.yml` is the one CI for the monorepo. This page says how it is split and why,
because the Dashboard (`apps/web`) is slow enough that one job for everything no longer fits.

## The jobs

| Job (check name) | Runs | When |
|---|---|---|
| `Plan` | decides whether the web jobs run | always |
| `Check packages` | `turbo run check` for every package except `@trajectonomics/web`, then the repository guards | always |
| `Check web` | the web package's lint, typecheck, `./src` tests and build (`turbo run lint typecheck test:src build`) | a pull request that affects `@trajectonomics/web` or `@trajectonomics/cli`, or that changes `ci.yml` or `.github/actions/`; every push to main and manual run |
| `Check web scripts (1)` ... `(4)` | one shard of `bun test ./scripts` in `apps/web`, through `turbo run test:scripts -- --shard=N/4` | same as `Check web` |
| `Check` | fails unless every job above passed (a skipped web job passes only when `Plan` said to skip it) | always |

Branch protection requires `Check` and `Conventional title`. Keep the job named `Check`, and add the
id of any new job to its `needs`: `tooling/guards/ci-web-split.test.ts` fails when it is missing.

## Why the web tests are split

`apps/web/scripts/` holds the end-to-end tests. They run the workspace's own `traj` binary hundreds
of times, so on a CI runner they took about 17 of the 20 minutes of a web pull request (1,000 s in
39 files, 145 s of it in `what-if-groups.test.ts`), against 13 s for `./src`. The shards run them in
parallel on separate runners. The command line depends on the web package and the web scripts tests
run the command line, so a change to either one runs them (this is also what `turbo run check` did
before, through `cli#build`).

- **Local `bun run check` is unchanged.** `apps/web`'s `check` still runs `bun run test`, which runs
  `./src` and `./scripts` in one process. `test:src` and `test:scripts` are the two halves, for CI
  and for running one half by hand.
- **The split is bun's own `--shard=N/M`,** so every job splits the same files the same way and the
  shards together run each file once. The number of shards is the length of `matrix.shard` in
  `ci.yml`. Run one by hand with `bun run test:scripts --shard=2/4` in `apps/web`.
- **`apps/cli/turbo.json`** makes the command line's `check` wait for the engine's check but not for
  the web check. Without it `--filter='!@trajectonomics/web'` still pulled the web check in through
  `^check`, and every command line change ran the whole web check inside `Check packages`.
- **Drift guard.** CI does not run the web `check` script itself. `tooling/guards/ci-web-split.test.ts`
  fails when that script gains a step, when `test` stops being `test:src` plus `test:scripts`, or when
  the workflow stops running them. Update the workflow in the same pull request.

## The Turborepo cache

Each job restores `.turbo/cache` from the newest entry for the lockfile (pull requests can read
`main`'s entries and their own) and saves one entry for the commit, also when the job failed, so a
retry skips the tasks that passed. `Check packages` and `Check web` have their own key prefix, since
two jobs cannot save one key; the shards only restore. Unchanged packages are cache hits (in the
recent runs read for #464, 6 and 12 of 16 or 17 tasks were hits, and every miss was a package whose
inputs changed). A change to the command line, the engine or `sim` makes `web#test:scripts` run
again, because it depends on `cli#build`.

## Where the browser checks go (#377)

A new job in `ci.yml`, with `needs: plan` and `if: needs.plan.outputs.web == 'true'`, added to the
`needs` of `check`. It runs only when `apps/web` or the command line changed and does not lengthen
`Check packages`.

## Not done here

- #460 (`what-if-groups.test.ts` times out under load) and `bun test --parallel` or `--timings` for
  a better balance between the shards.
- Generating the Demo snapshot once per run and sharing it as an artifact: it waits for #378, which
  makes the Demo a build output.

# CI runbook

`.github/workflows/ci.yml` is the one CI for the monorepo. This page says how it is split and why,
because the Dashboard (`apps/web`) is slow enough that one job for everything no longer fits.

## The jobs

| Job (check name) | Runs | When |
|---|---|---|
| `Plan` | decides whether the web jobs run | always |
| `Check packages` | `turbo run check` for every package except `@trajectonomics/web`, then the repository guards | always |
| `Check web` | the web package's lint, typecheck, `./src` tests and build (`turbo run lint typecheck test:src build`) | a pull request that affects `@trajectonomics/web` or `@trajectonomics/cli`, or that changes `ci.yml` or `.github/actions/`; every push to main and manual run |
| `Check web scripts (1)` ... `(4)` | one shard of `bun test ./scripts` in `apps/web`: `turbo run @trajectonomics/cli#build @trajectonomics/web#demo`, then `bun run test:scripts --shard=N/4` | same as `Check web` |
| `Check web browser` | the browser checks over the built Demo: `turbo run @trajectonomics/web#build`, then `bun run test:browser` in `apps/web` | same as `Check web` |
| `Check` | fails unless every job above passed (a skipped web job passes only when `Plan` said to skip it) | always |

Branch protection requires `Check` and `Conventional title`. Keep the job named `Check`, and add the
id of any new job to its `needs`: `tooling/guards/ci-web-split.test.ts` fails when it is missing.

- **`Check` judges all of `needs`, not a list of job names.** Its script reads `toJSON(needs)`: every
  job must be `success`, and a job may be `skipped` only when `Plan` said to skip the web jobs (`Plan`
  and `Check packages` may never be skipped). A job added to `needs` is therefore judged with no edit
  to the script, and a failing one fails `Check`.
- **`Check` runs with `if: always()`,** not `!cancelled()`. A cancelled run (a new push, or a person)
  then fails `Check`. GitHub counts a skipped required check as passing, so a skipped `Check` would let a
  cancelled run look green.

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

## Reproducible Dashboard build

SvelteKit stamps a build with the time it ran, so two builds of one commit packed different
`dashboard.bin` bytes. `apps/web/vite.config.ts` now stamps it with `TURBO_HASH`, the hash turbo gives
the task from its inputs, so the same inputs pack the same bytes and a changed file is a new version
([web ADR 0028](../../apps/web/docs/adr/0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md)).
`TRAJ_WEB_VERSION` pins the stamp for a build outside turbo (used to compare two commits by raw `sha256`, see the ADR) and is never set in a workflow, so the web build stays a cache hit when no web input changed.
The `Check web` job runs `turbo run @trajectonomics/web#build --cache=local: --only` twice (no cache, so the build runs and no cache entry is written) and fails when the
`sha256` of `pack/dashboard.bin` differs.

## Files outside every package

`tooling/config/**` (the shared Biome and TypeScript config) and `tooling/scripts/**` are
`globalDependencies` in the root `turbo.json`: a change to them affects every package, so
`turbo run check --affected` checks everything. Before, a pull request that changed only those files
affected no package and CI checked nothing. The price is intended: such a change invalidates every
Turborepo cache entry and runs a full check.

## The Turborepo cache

Each job restores `.turbo/cache` from the newest entry for the lockfile (pull requests can read
`main`'s entries and their own) and saves one entry for the commit, also when the job failed, so a
retry skips the tasks that passed. `Check packages` and `Check web` have their own key prefix, since
two jobs cannot save one key; the shards only restore the packages entry. Unchanged packages are cache
hits (in the recent runs read for #464, 6 and 12 of 16 or 17 tasks were hits, and every miss was a
package whose inputs changed). The jobs of one run start together and save at their end, so the entry a
job restores comes from an earlier run: the first run after a change to the command line, the engine,
`sim` or the Demo's inputs misses those tasks in every job, and a later run (a retry, a push that
leaves them alone) hits them.

**Never put `--shard` (or any argument after `--`) on a turbo command that has dependencies.** Turbo
adds the arguments after `--` to the hash of every task in the graph. A shard that ran
`turbo run test:scripts -- --shard=N/4` therefore hashed its `demo`, `core#build` and `cli#build`
differently from `Check packages`, and missed them even when the packages job had them cached (run
45468426958: `Check packages` hit all 16 tasks, including `demo`, and shard 1 missed all 10). A shard
now builds in its own step, `turbo run @trajectonomics/cli#build @trajectonomics/web#demo`, whose
hashes equal the packages job's, and runs its files with `bun run --cwd apps/web test:scripts
--shard=N/4`, with no turbo around it. That is the whole task graph of `test:scripts` (its
`dependsOn` in `apps/web/turbo.json`), and `tooling/guards/ci-web-split.test.ts` pins both steps and
that the shard carries no `--`.

## The browser checks (#377)

`Check web browser` runs a headless Chromium over the built Demo ([web ADR 0026](../../apps/web/docs/adr/0026-a-headless-browser-checks-the-demo-at-phone-width-and-in-print.md)). It has `needs: plan` and
`if: needs.plan.outputs.web == 'true'`, is in the `needs` of `Check`, and does not lengthen `Check packages` or
the shards, which it runs beside.

- **What it checks.** Every page of the Demo at 360px and 1280px in the light and the dark theme (no
  horizontal page scroll, a wide table inside a scroll box that fits), a screen-reader-only label in the last cell of each
  table at 360px, with amounts shown and hidden (it must not widen the page), and Reports, Year by year and Cash flow in print on
  A4 landscape (tables fit 1032px, black on white, the same surfaces from either theme). The suite is
  `apps/web/browser/`, and `tooling/guards/ci-web-split.test.ts` pins the job.
- **The hosted Demo.** The same job also builds `build:hosted` and checks `dist-hosted/` served under `/demo/` (`apps/web/browser/hosted.e2e.ts`, [web ADR 0028](../../apps/web/docs/adr/0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md)): every page at 360px and 1280px, no request but a GET of its own files, only the Demo snapshot read, and every Edit control switched off.
- **Steps.** The build is `bunx turbo run @trajectonomics/web#build @trajectonomics/web#build:hosted --concurrency=2`, with no arguments after
  `--` for the reason in the cache section below. Chromium comes from `actions/cache` on `~/.cache/ms-playwright`
  with the same key as `browser.yml` and `docs-browser.yml` (`playwright-<os>-<version>`), so one download serves
  all three; a cache hit still runs `playwright install-deps`, because the system libraries are not cached. The
  suite is `bun run test:browser` in `apps/web`.
- **Artifacts.** `web-screenshots` (every page at both widths and both themes, and the three printed pages in
  both themes) is uploaded on every run, pass or fail, for 7 days: open it to look at what CI checked.
  `web-playwright-report` (the HTML report and traces) is uploaded on failure only.
- **Budget.** 10 minutes, as the job's `timeout-minutes`. Measured in this pull request's own green run (#497): 102 s for the whole job,
  of which the build step 8 s (turbo cache hit), the browser cache 3 s, Chromium's system libraries 8 s, the
  suite 70 s (144 tests, 2 workers) and the screenshot upload about 3 s (17 MB). The shards take 2m47s to
  6m03s, so the job (about 2 minutes) is not on the critical path. A cold build adds about 40 s, a cold browser download about
  30 s more.
- **The font.** Widths depend on the font, so the suite pins Liberation Sans (`playwright install-deps` installs it) and fails when it is missing.
- **Locally.** `bun run check` never runs it. Build first, then `bun run test:browser` in `apps/web` (see
  `apps/web/AGENTS.md`).
- **When it fails.** The message names the page, the width or the paper, and the table or the text, for
  example `table "Period" is 1355px wide`. Open the screenshot of that page in the artifact, fix the page,
  and do not loosen the rule. A rule that is wrong goes through its own pull request and ADR.

## The Demo snapshot is generated per job, not once per run (#464)

Since #378 the Demo snapshot (`apps/web/public/demo/snapshot.json`) is a build output: the turbo `demo`
task compiles `traj` and runs it against the fictional ledger, and `build`, `test:src`, `test:scripts`
and `check` depend on it. Option 1 of #464 was to run it once in its own job and share the file with the
jobs that need it. It was measured and **not done**, because it cannot shorten a run.

Measured in the CI logs of five green runs after #378 (four pull request runs and one push to `main`,
2026-11-24), before the fix above:

| Job | `demo` task | Cache |
|---|---|---|
| `Check web scripts (1)` ... `(4)` | 13.9 s to 23.2 s each | miss in all 20 |
| `Check packages` | 15.5 s to 20.4 s | miss in 4 of 5 runs |
| `Check web` | runs beside lint and typecheck, so 3 s to 5 s past `typecheck` | miss in 4 of 5 runs |

A shard took 3m01s to 7m06s, so `demo` was 3 to 13 percent of one (about 5 percent of the longest). The
shards missed even when the packages job hit (run 45468426958) because of the `--shard` hash described
above, not because nothing was cached.

With the fix, in this pull request's own runs (seconds after the shard's first log line; the build
step is `turbo run @trajectonomics/cli#build @trajectonomics/web#demo`):

| Run | Build step in a shard | Tests start |
|---|---|---|
| Before the fix (two runs, 8 shards) | 21 s to 35 s, `demo` and `cli#build` rebuilt | +32 s to +48 s |
| Fix, first run (it changed `cli/src` through `main`; 3 of 10 tasks missed, in every job) | 24 s to 29 s | +39 s to +44 s |
| Fix, second run (the entry the first run saved) | 0.3 s to 0.5 s, 10 of 10 hits (FULL TURBO) | +15 s to +26 s |

So a run that follows one that built the same command line and Demo (a retry, a push to web files only)
saves about 20 s on every shard, which is where the 3 to 13 percent went. The first run after a command
line change still builds once per job, as it must.

Why a shared job does not win the time back, even with that fixed: the shards are the critical path, and
they would have to wait for the new job, which needs a checkout, the setup action, the engine build, the
`demo` task and the upload (about 50 s, even started beside `Plan`). A shard starts its tests 30 to 50 s
after it starts (the setup, then the build step), so with the artifact it would start them later, with one
more job, an artifact to keep in step with the turbo task hash and one more entry in `needs`. The only
gain is runner minutes. With the fix, `demo` is a cache hit in every job of a run that follows one that
built it, which costs nothing.

## Not done here

- #460 (`what-if-groups.test.ts` times out under load) and `bun test --parallel` or `--timings` for
  a better balance between the shards.

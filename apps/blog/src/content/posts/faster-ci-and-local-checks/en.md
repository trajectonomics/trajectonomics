---
title: "Faster CI, Faster Agents: Cutting Monorepo Checks from 7 Minutes to 4m 40s"
description: "When AI coding agents run your test suite dozens of times a day, slow checks tax every iteration. How three PRs cut our root lint by 6.3×, web typecheck by 2.4×, and full GitHub Actions CI from 425s to 279s without relaxing a single check."
type: essay
publishedOn: 2026-11-28
cover:
  src: /blog/posts/faster-ci-and-local-checks/cover.webp
  alt: Three matte cream robots with glowing orange eyes step forward along three glowing orange parallel tracks across carved wood-grain dunes under a dark night sky, below the words "Faster CI, Faster Agents — 3 PRS · 425S → 279S"
  width: 1024
  height: 1024
---

In a [Software Factory](/blog/essays/software-factory/), checks are not a formality you run once before opening a pull request. Coding agents run `lint`, `typecheck`, `test` and CI continuously—every time an agent waits 20 seconds for Biome or 7 minutes for GitHub Actions, that wait multiplies across every parallel branch in flight.

When agents in our monorepo started reporting that local `lint` and CI runs felt sluggish, we audited the pipeline end-to-end and landed three focused pull requests: [PR #804](https://github.com/trajectonomics/trajectonomics/pull/804), [PR #808](https://github.com/trajectonomics/trajectonomics/pull/808) and [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811). Every lint rule, type check, unit test, build check and Playwright browser test stayed intact.

<figure>
  <img src="/blog/posts/faster-ci-and-local-checks/before-after-en.webp" alt="Horizontal before-and-after bar chart comparing GitHub Actions CI jobs and local commands across PR #804, #808 and #811: total CI wall time dropped from 425s to 279s, web browser from 387s to 250s, web scripts from 341s to 166s, packages from 171s to 81s, web check from 57s to 27s; locally sim tests dropped from 57.4s to 13.4s, web typecheck from 56.0s to 23.0s, data typecheck from 33.5s to 10.4s, CLI dump test from 27.6s to 3.7s, and root turbo lint from 20.4s to 3.3s." width="1600" height="900" loading="lazy" />
  <figcaption>Measured before and after across GitHub Actions (<a href="https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046">#46028422046</a> vs <a href="https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596">#46041970596</a> and <a href="https://github.com/trajectonomics/trajectonomics/actions/runs/46046018982">#46046018982</a>) and local runs. Every bar starts at zero.</figcaption>
</figure>

## Why checks had slowed down

None of the slowdowns came from one dramatic bug. They accumulated from four quiet defaults:

1. **Sequential work where inputs were independent.** Our `turbo.json` made `lint` depend on `^build`, so running `bun run lint` at the root compiled 9 upstream packages before Biome could inspect static files. Inside packages, `tsc`, `astro check`, `svelte-check`, `lint` and `test` ran strictly one after another.
2. **Repeated test setup.** Fifteen snapshot script tests each rebuilt the same Demo SQLite ledger from scratch, and scratch browser tests spawned `bun run apps/cli/src/index.ts` instead of reusing the already-compiled `apps/cli/dist/traj` binary.
3. **Single-threaded test runs on multi-core machines.** Bun 1.4.4 supports `--parallel --no-isolate`, yet our heaviest suites (`packages/core/sim`, `apps/cli`, `apps/web`) still ran files sequentially.
4. **Under-utilized CI runners and double builds.** Our 4-vCPU GitHub Actions runners were capped at `--concurrency=2` and Playwright `workers: 2`, all web browser tests sat on a single runner (`387s`), and the Site browser workflow built the Site twice and re-downloaded Chromium even on cache hits.

## Three pull requests, one layer at a time

We split the work into three small, independently revertible pull requests so each measurement stood on its own.

### 1. Test speed and parallelism ([PR #804](https://github.com/trajectonomics/trajectonomics/pull/804))

- **Bounded snapshot concurrency:** Added a 4-slot worker pool ([`run-pool.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/scripts/run-pool.ts)) across snapshot stage, allowance, path and tax-note runners while preserving exact JSON key order and byte-for-byte determinism.
- **Memoized Demo ledger template:** Built the shared Demo SQLite ledger once per process and copied it into each test's temp directory ([`demo-ledger.test-support.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/scripts/demo-ledger.test-support.ts)) across 15 script test callers.
- **Compiled CLI reuse in scratch e2e:** Added [`scratch-cli.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/browser/scratch-cli.ts) so scratch browser tests run `apps/cli/dist/traj` directly whenever its mtime is newer than `apps/cli/src`.
- **Leaner stress loop:** Reduced the concurrent SQLite writer loop in [`dump.test.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/src/store/dump.test.ts) from 2,000 iterations to 250 (`27.6s → 3.69s`), still exercising concurrent WAL reads and writes without burning half a minute.
- **Bun parallel test execution:** Enabled `--parallel --no-isolate` in `packages/core/sim` (`57.39s → 13.37s`), `apps/cli`, and `apps/web`.

### 2. CI workflows and browser checks ([PR #808](https://github.com/trajectonomics/trajectonomics/pull/808))

- **Match runner capacity:** Raised CI Turbo concurrency from `2` to `4` in [`.github/workflows/ci.yml`](https://github.com/trajectonomics/trajectonomics/blob/main/.github/workflows/ci.yml) and Playwright CI `workers` from `2` to `4` in [`apps/web/playwright.config.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/playwright.config.ts) and [`apps/site/playwright.config.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/playwright.config.ts). Local `AGENTS.md` guidance stays at `--concurrency=2` so shared dev boxes running multiple agents do not swap.
- **More sharding where it hurt:** Expanded `Check web scripts` from 4 shards to 6 (`341s → 166–168s` max shard) and split `Check web browser` across 2 shards (`387s → 249–250s` max shard).
- **Smarter cache restore and single-build site browser CI:** Added coarser Turbo fallback restore keys, preferred the `-packages-` cache (which holds `cli#build`, `web#build:hosted` and `web#demo`) before `-web-`, skipped Chromium binary downloads on Playwright cache hits, and changed [`.github/workflows/browser.yml`](https://github.com/trajectonomics/trajectonomics/blob/main/.github/workflows/browser.yml) to build `@trajectonomics/site#build` once instead of twice—cutting Site browser CI from [273s](https://github.com/trajectonomics/trajectonomics/actions/runs/46036536078) to [160–168s](https://github.com/trajectonomics/trajectonomics/actions/runs/46052307647).

### 3. Decoupled `lint` and parallel `typecheck` / `check` ([PR #811](https://github.com/trajectonomics/trajectonomics/pull/811))

- **Uncoupled `lint` from `^build`:** Dropped `"dependsOn": ["^build"]` from `lint` in [`turbo.json`](https://github.com/trajectonomics/trajectonomics/blob/main/turbo.json) and [`apps/site/turbo.json`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/turbo.json), and wired root `bun run format` through Turbo. An uncached root `turbo run lint --force --concurrency=4` dropped from **20.44s** (27 tasks) to **3.26s** (18 tasks)—**6.3× faster**.
- **Buffered parallel step runner:** Added [`tooling/scripts/run-parallel.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/tooling/scripts/run-parallel.ts), a small Bun script that runs independent commands concurrently, buffers each command's output so logs never interleave, prints failure banners deterministically, and forwards `SIGINT`/`SIGTERM` to children.
- **Parallel compilers and checks:** Ran `tsc`, `svelte-check`, and `astro check` in parallel inside `typecheck` (cutting `apps/web` `typecheck` from `55.96s` to `23.00s` and `apps/data` `typecheck` from `33.51s` to `10.39s`), and ran `lint`, `typecheck` and `test` in parallel inside `check` before the build and verify steps.
- **Fast archived-link guard:** Switched [`tooling/guards/archived-links.test.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/tooling/guards/archived-links.test.ts) from reading every tracked file (including binary images and fonts) twice sequentially to prefiltering text candidates with `git grep -I -l -F -z` and memoizing results—turning a 5-second timeout flake under load into **44.5ms**.

## Four real bugs concurrency surfaced

Speeding up checks is only useful if determinism stays rock-solid. Running tasks concurrently surfaced four subtle bugs that sequential execution had hidden:

1. **`FORCE_COLOR=1` leaked ANSI escapes into JSON stderr.** Under Turbo's PTY, Bun's `console.error` wrapped error envelopes in ANSI red, breaking CLI JSON tests when run under `--parallel`. Writing stderr directly with `writeSync(2, ...)` in [`apps/cli/src/index.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/src/index.ts) fixed it cleanly.
2. **Never swap `console.log` for `process.stdout.write` right before `process.exit()`.** While fixing stderr, we briefly tried `process.stdout.write` on stdout too—and immediately truncated >64 KB `traj projection run --json` payloads on pipe exit. Keeping `console.log` for stdout (and setting `process.exitCode` instead of `process.exit()`) prevented truncated JSON.
3. **`astro check --no-sync` still ran `astro sync`.** Astro 7.4's `mri` CLI parser turns `--no-sync` into `{ sync: false }`, whereas `astro check` inspects `flags.noSync`! That meant `astro check` was still rewriting `.astro/types.d.ts` right while `tsc` read it. Passing `--noSync` (camelCase) after a single upfront `astro sync` eliminated both the race and 2–6 seconds of duplicate work per Astro app.
4. **Slow tests hide until CPU contention rises.** Reading thousands of tracked files twice in `archived-links.test.ts` barely passed when `Check packages` ran at `--concurrency=2`, then hit Bun's 5-second timeout once 4 packages ran together. Prefiltering with `git grep -I` made the guard >150× faster.

## Measured results

| Check / Command | Before | After | Speedup | Source |
| --- | ---: | ---: | ---: | --- |
| Root `turbo run lint` (0 cached) | 20.44s | **3.26s** | **6.3×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| `apps/web` `typecheck` | 55.96s | **23.00s** | **2.4×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| `apps/data` `typecheck` | 33.51s | **10.39s** | **3.2×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| `packages/core/sim` `test` (local) | 57.39s | **13.37s** | **4.3×** | [PR #804](https://github.com/trajectonomics/trajectonomics/pull/804) |
| `apps/cli` `dump.test.ts` | 27.6s | **3.69s** | **7.5×** | [PR #804](https://github.com/trajectonomics/trajectonomics/pull/804) |
| `tooling/guards` `archived-links.test.ts` | >7s (timeout) | **44.5ms** | **>150×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| CI `Check packages` (warm cache) | 171s | **81s** | **2.1×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46041970596](https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596) |
| CI `Check web` | 57s | **27–31s** | **~2.0×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46041970596](https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596) |
| CI `Check web scripts` (slowest shard) | 341s | **166–168s** | **2.0×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46046018982](https://github.com/trajectonomics/trajectonomics/actions/runs/46046018982) |
| CI `Check web browser` (slowest shard) | 387s | **249–250s** | **1.55×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46046018982](https://github.com/trajectonomics/trajectonomics/actions/runs/46046018982) |
| CI `Browser checks (site)` | 273s | **160–168s** | **1.6–1.7×** | [#46036536078](https://github.com/trajectonomics/trajectonomics/actions/runs/46036536078) → [#46052307647](https://github.com/trajectonomics/trajectonomics/actions/runs/46052307647) |
| CI total wall time (`ci.yml`) | 425s (7m 05s) | **279–280s (4m 40s)** | **1.52×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46041970596](https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596) |

## Check it yourself

You can repeat the local timings on any checkout of [`trajectonomics/trajectonomics`](https://github.com/trajectonomics/trajectonomics):

```sh
DO_NOT_TRACK=1 bunx turbo run lint --force --concurrency=4
DO_NOT_TRACK=1 bun run --cwd apps/web typecheck
DO_NOT_TRACK=1 bun run --cwd packages/core/sim test
DO_NOT_TRACK=1 bun run --cwd tooling/guards test
```

Fast verification is what lets a small team—and its coding agents—keep strict gates without paying a seven-minute tax on every change. For more on how those gates fit together, see [Review Proof, Not Code](/blog/essays/review-proof-not-code/).

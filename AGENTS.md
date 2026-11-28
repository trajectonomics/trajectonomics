# AGENTS.md

Instructions for AI coding agents in `trajectonomics/trajectonomics`, the monorepo. This file holds the rules, skills and conventions shared by every package. Each package's own `AGENTS.md` holds only what is specific to that package, and an agent working in a package reads this file first.

## Repository map

- [`apps/site`](apps/site/AGENTS.md): the Site at trajectonomics.com (Worker `site`, static HTML), which hosts every product's landing page (traj at `/`, OpenJot at `/openjot/`).
- [`apps/docs`](apps/docs/AGENTS.md): the docs portal at trajectonomics.com/docs (Worker `docs`, `@trajectonomics/docs`).
- [`apps/blog`](apps/blog/AGENTS.md): the blog at trajectonomics.com/blog (Worker `blog`, static Astro).
- [`apps/data`](apps/data/AGENTS.md): the data site at trajectonomics.com/data (Worker `data`, D1 `traj-data`, the usage collector in `apps/data/collector`).
- [`apps/auth`](apps/auth/AGENTS.md): the account platform at auth.trajectonomics.com (Worker `auth`, D1 `traj-auth`, Better Auth with Google, GitHub, passkeys, device authorization and Ed25519 JWTs).
- [`apps/web`](apps/web/AGENTS.md): the Dashboard, a read-only static web app in Svelte 5 that renders a Snapshot of `traj --json` results on `127.0.0.1` (`@trajectonomics/web`, never published; its hosted Demo build is served as static pages by the Site).
- [`apps/openjot`](apps/openjot/AGENTS.md): OpenJot (formerly MooJot), the Android app: Tauri 2, a SvelteKit 2 frontend, Rust for the engine and Kotlin for the Android-native parts.
- [`apps/cli`](apps/cli/AGENTS.md): `@trajectonomics/cli`, the `traj` command line.
- `packages/core`: `@trajectonomics/core`, the engine bundle the CLI builds on (private, not published). It bundles the four packages below as subpath exports (`/money`, `/ledger`, `/tax`, `/sim`).
  - [`packages/core/money`](packages/core/money/AGENTS.md), [`packages/core/ledger`](packages/core/ledger/AGENTS.md), [`packages/core/tax`](packages/core/tax/AGENTS.md), [`packages/core/sim`](packages/core/sim/AGENTS.md): private workspace packages.
- [`packages/brand`](packages/brand/AGENTS.md): `@trajectonomics/brand`, the white-label brand folders, themes and assets. Not published. It also holds the one header frame every static site draws (`header.css` and `decorativeMark` from `./mark`), so the logo never moves between the Site, the blog, the data site and the docs; `tooling/guards/header-frame.test.ts` fails an app that keeps its own copy.
- [`packages/site-header`](packages/site-header/AGENTS.md): `@trajectonomics/site-header`, the one Astro header and Language menu the Site, the blog and the data site render (raw `.astro`, no build step). Not published.
- [`skills/customer`](skills/customer/AGENTS.md): the first-party customer skills that the product publishes (`@trajectonomics/skills`).
- [`skills/internal`](skills/internal/AGENTS.md): the internal skills. Their source lives here, and `.agents/skills/` links to it.
- [`org/goals`](org/goals/AGENTS.md): the organisation's goals (`GOALS.md`).
- `tooling/`: shared Biome and TypeScript config (`tooling/config`) and the migration scripts (`tooling/migrate`).

## Rules

1. Never commit to `main`. Branch (`feat/*`, `fix/*`, `docs/*`) and open a PR. PR titles are conventional commits (`feat:`, `fix:`, `feat!:` ...). A scope is optional, and when present it is one from the closed list in [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml): a package without its own scope uses the nearest one (`skills` for `skills/internal`, `ci` for `tooling/guards`). Branch with `git switch --no-track -c <branch> origin/main` and push with `git push -u origin HEAD:<branch>`: a branch that tracks `origin/main` pushes to `main` on a bare `git push` when `push.default=upstream`.
2. Never commit secrets or `.env` files. Publishing tokens (`NPM_TOKEN`) live in repo secrets only; Cloudflare credentials live in Cloudflare (Workers Builds), never in this repository.
3. Bun only: `bun install`, `bun test`, `bun run <script>`. Do not add npm/pnpm/yarn lockfiles.
4. Package design: keep core packages pure and deterministic wherever applicable (data in, data out, no I/O, no clock, no unseeded randomness). Keep boundaries closed-world with explicit contracts.
5. Done means `bun run check` passes at the root (Turborepo). `check` depends on the package's own `build` in turbo, so each package's `dist/` has one writer per run. A package's `check` script still builds, through `tooling/scripts/build-unless-turbo.ts`: a no-op under turbo (which sets `TURBO_HASH`), a `bun run build` when `bun run check` runs inside the package, so a direct run never reads a stale `dist/`. `apps/docs`, `apps/blog` and `apps/site` opt out of the turbo dependency: their `check` builds and scans the built site, and nothing depends on them (`turbo run build check` would still run their build twice). For one package, `bunx turbo run check --filter=<package>`. `bun run format` fixes formatting and import order. Do not loosen the shared config in `tooling/config`, a package's `biome.json`, or its `tsconfig` to make an error go away.
6. Never edit `version` in a `package.json` by hand and never run `npm publish` locally. Release versions are set by the release process.
7. Model & Pi (`pi.dev`) rules:
   - Never use `gemini-3.8-flash` anywhere; use `gemini-4-hydrogen` instead for Antigravity tasks and reviews (and `gemini-4-argon` where configured).
   - When running the Pi coding agent (`pi.dev`), strictly use **DeepSeek 4.1 Flash** only (e.g., `deepseek/deepseek-v4.1-flash`, `deepseek/deepseek-v4.1-flash-fast`), whether routed via Command Code GOAT (`command-code`) or OpenCode Go (`opencode`). Do not switch to or run any other models (Claude, GPT, Gemini, etc.) in Pi sessions for this repository. This rule is mechanically enforced via `.pi/settings.json`.
8. Temporary files and scratch clones: `/tmp` is a shared, nearly full tmpfs. Never use fixed `/tmp` filenames (use `mktemp`, or `--body-file -` for `gh` bodies), and never install `node_modules` or clone scratch repositories under `/tmp`. Verification clones go under `~/.cache/<slug>`. Remove only the directory your own `mktemp -d` returned (`d=$(mktemp -d -p ~/.cache)`, then `rm -rf "$d"`), never an inherited `$TMPDIR` you did not create and never a glob such as `~/.cache/tmp.*`: other sessions' directories match it and vanish mid-run. A test makes its temporary directory through the package's helper (`makeTempDir` in `apps/cli`, `makeScratch` in `apps/web`) or removes it itself, and `tooling/guards` fails on a `mkdtemp` call with no removal in the same file, ignoring one that appears only in a line comment and exempting the files named in its short allow-list, each with the helper that removes their directory.
9. Resource limits: run turbo with `--concurrency=2`, and wrap heavy builds in a memory cap, for example `systemd-run --user --scope -q -p MemoryMax=6G <command>`.
10. UI frameworks: an app with a client-side interface is written in Svelte 5 (`apps/web`). React is allowed only in `apps/docs`, and there only because Fumadocs needs it; do not add React to another package. `apps/site` ships static HTML with no UI framework.
11. One host: every static site is served under `trajectonomics.com` (owner, 2026-11-27). A product's landing page is built in `apps/site`; the docs, the blog and the data site keep their own Workers and are mounted at `/docs`, `/blog` and `/data` by zone routes, with no router Worker. Only a single-page app gets a subdomain of its own. A retired subdomain stays attached to redirect to its new path, and keeps answering, without a redirect, any endpoint that clients already shipped still call (the data site's `/api/*` and `/ingest`, OpenJot's `/ingest`), because a redirect would turn their POST into a GET.
12. Visual first: when you build, change or review anything a person looks at (a screen, a chart, a landing page, a doc page or a pull request), read [`DESIGN_PRINCIPLES.md`](DESIGN_PRINCIPLES.md) first. Show the answer as a picture, and use words only where a picture cannot carry it.
13. The repository is AGPL-3.0-only. A new package ships the root `LICENSE` text and `"license": "AGPL-3.0-only"`. Vendored third-party code keeps its own licence and is listed in `THIRD_PARTY_NOTICES.md`.

## Organisation goals

The organisation's goals are in [`org/goals/GOALS.md`](org/goals/GOALS.md). Read them before proposing a new direction. Only the owner edits that file; never edit it.

Product, growth and roadmap research lives in `research/` in the private `trajectonomics/marketing` repository, which replaced the retired `trajectonomics/growth`. Research that names a competitor stays there, never in this public repository.

## Owner

Saving the owner's attention is part of the job, so finish a task instead of asking about it.

- Finish end-to-end: commit, push, open the PR, get an independent review, `gh pr merge --auto` when the work is green or the owner said to proceed, then do the follow-up steps the change implies. Do not stop for small permission questions, and do not end with a `## Not done yet` list.
- When unsure, consult subagents on other models (`claude-sonnet-5-5`, `gemini-4-hydrogen`, `gemini-4-argon`, and `deepseek-v4.1-flash`) instead of asking the owner. The model rules above still decide which one a session may itself run.
- `main` has a merge queue (ruleset "main: merge queue", owner, 2026-11-28). `gh pr merge --auto` adds a green, reviewed pull request to the queue; then confirm it merged, or fix it and queue it again if the queue drops it (a failed group or a timeout). The queue runs the required checks (`Check`, `Conventional title`) on the pull request merged onto `main` and the entries ahead of it, then squash-merges, so several pull requests can merge in a row. Do not merge `main` into a branch only to re-run CI; merge it to resolve a conflict or to test against a change that has already landed. The rule the queue enforces is that CI must run against the current `main`: on 2026-11-23 #249 and #257 each passed alone and together broke `packages/core/sim`'s check on `main`.
- Any `traj` an agent runs for a test, validation or eval sets `DO_NOT_TRACK=1`, so it never counts as a person using `traj` in the usage telemetry that goal G1 is measured by.
- Any `traj` an agent runs by hand sets `TRAJ_HOME` to a scratch directory it made first and checked is non-empty. An unset or empty `TRAJ_HOME` falls back to the owner's real ledger in `~/.traj`. On 2026-11-23 a development build run that way migrated that ledger to a schema no released `traj` reads, and it had to be restored from its pre-migration copy.
- Verify before calling something blocked: read live GitHub state (`gh issue view`, `gh pr view`) and the real CLI/API schema first.
- Keep replies short and lead with what only the owner must do; add detail when asked.
- Record every durable lesson here, in the package's `AGENTS.md` or in `docs/`, never only in agent memory.
- Settle your own T3 thread (`t3_thread_organize`, `action: "settle"`) when the work is done and nothing waits on the owner.

## Subagents

Delegate by default: this section is the owner's standing request to use subagents, so spawn them without being asked again. The lead session plans, briefs, reviews the diffs and merges, and subagents on cheap models do the legwork (reading, searching, editing, running checks). Do a step yourself only when briefing it costs more than doing it, such as a one-line edit or a single command. Brief each one with the files, the exact change and its completion criterion, because a subagent starts without your context. A Pi session keeps rule 7's DeepSeek-only models, and a package whose `AGENTS.md` names its own work model (such as `apps/site`) keeps it inside that package; this ladder is the default everywhere else.

Pick the cheapest model that can finish the brief:

1. `claude-haiku-5-5` for a Claude subagent (the `Agent` tool, `model: haiku`).
2. `opencode-go/deepseek-v4.1-flash` for a task on OpenCode (`delegate_task`, or `t3_thread_launch` with the `opencode` provider on a linked machine). See "DeepSeek on OpenCode Go implements" below.
3. A model from the Owner section's list (`claude-sonnet-5-5`, `gemini-4-hydrogen`, `gemini-4-argon`) only when a cheap one failed the brief, or for design and the independent review. The reviewer is a different model from the author.

A brief to DeepSeek, on OpenCode Go or on the free tier (`opencode/deepseek-v4.1-flash-free`, used when the paid route is out), carries this repository's code and docs only: never a secret, a token or a person's financial data.

### DeepSeek on OpenCode Go implements (from 2026-11-25, until the owner says otherwise)

On 2026-11-25 the owner subscribed to OpenCode Go and made `opencode-go/deepseek-v4.1-flash` the main implementor. Earlier that day every DeepSeek route had run dry, and Muse (`muse-ember-1.0`) used up its allowance, so Claude implemented for a few hours. Muse is not used.

- An implementation brief goes to `opencode-go/deepseek-v4.1-flash` before `claude-haiku-5-5`, which keeps reading, searching and cheap checks. A brief DeepSeek cannot finish goes to `claude-sonnet-5-5`.
- The independent review stays on Claude, on `claude-opus-5-5` when `claude-sonnet-5-5` wrote the diff.

## Token budget

Every model call re-reads the whole context, so spend grows with context size times calls. In the week to 2026-11-28, 40% of the Claude spend went on calls with more than 200k tokens of context. The DeepSeek delegates averaged 173k per call.

- One thread per issue or PR. When its PR is merged the thread settles, and the next issue starts a fresh thread: a fresh start loads about 50k tokens, while a long thread re-reads 300k or more on every call.
- Wait on a background task with `t3_background_wait`, on a delegate with its `next`, and on a PR with `watch_pull_request`. Each turn of a `sleep` loop re-reads the full context.
- Read output narrowly: `rg -l` before `rg`, `git diff --stat` before the diff, `| tail -40` on check output, `sed -n` ranges on long files. When a broad search sweeps many files, give it to an Explore or `claude-haiku-5-5` subagent and keep only its conclusion.
- Read only the screenshot that answers the question, cropped to the region you check (`ffmpeg -loglevel error -i in.png -vf crop=W:H:X:Y out.png`). Each image you read stays in context for the rest of the thread.
- Drive a browser flow with one script that prints only what you check, rather than one tool call per click.
- A delegate brief names the files in scope, so the delegate opens those instead of exploring the repository.

## Agent skills

### Adding or editing a skill

Read [`docs/agents/skills.md`](docs/agents/skills.md) first: where each skill comes from (external, internal, customer), which copy to edit, the symlinks, the lock, and the `skills` commands.

### Reviewing a diff

[`CODING_STANDARDS.md`](CODING_STANDARDS.md): the conventions `bun run check` cannot enforce. Read it when reviewing, not when implementing.

### Issue tracker

Issues for this monorepo live in GitHub Issues in `trajectonomics/trajectonomics`, via the `gh` CLI. See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Each package keeps its own `GLOSSARY.md` and `docs/adr/` at its root, because each one has its own vocabulary. Read the ones for the package you work in. See [`docs/agents/domain.md`](docs/agents/domain.md).

## Factory Runs

A Factory Run or Spec drafter (a thread titled `traj/trajectonomics/<repo>#<n>` or `triage/trajectonomics/<repo>#<n>`) takes its instructions from the Dispatcher runbook in `trajectonomics/factory`, never from this repository, where `docs/dispatcher-runbook.md` does not exist. Read it with `gh api repos/trajectonomics/factory/contents/docs/dispatcher-runbook.md -H "Accept: application/vnd.github.raw"`. If you cannot read it, stop and say so; do not build from the issue alone.

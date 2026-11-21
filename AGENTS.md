# AGENTS.md

Instructions for AI coding agents in `trajectonomics/trajectonomics`, the monorepo. This file holds the rules, skills and conventions shared by every package. Each package's own `AGENTS.md` holds only what is specific to that package, and an agent working in a package reads this file first.

## Repository map

- [`apps/site`](apps/site/AGENTS.md): the Site at trajectonomics.com (Worker `site`, static HTML).
- [`apps/docs`](apps/docs/AGENTS.md): the docs portal (Worker `docs`, `@trajectonomics/docs`).
- [`apps/blog`](apps/blog/AGENTS.md): the blog (Worker, not deployed yet).
- [`apps/cli`](apps/cli/AGENTS.md): `@trajectonomics/cli`, the `traj` command line.
- `packages/core`: `@trajectonomics/core`, the engine bundle the CLI builds on (private, not published). It bundles the four packages below as subpath exports (`/money`, `/ledger`, `/tax`, `/sim`).
  - [`packages/core/money`](packages/core/money/AGENTS.md), [`packages/core/ledger`](packages/core/ledger/AGENTS.md), [`packages/core/tax`](packages/core/tax/AGENTS.md), [`packages/core/sim`](packages/core/sim/AGENTS.md): private workspace packages.
- [`packages/brand`](packages/brand/AGENTS.md): `@trajectonomics/brand`, the white-label brand folders, themes and assets. Not published.
- [`skills/customer`](skills/customer/AGENTS.md): the first-party customer skills that the product publishes (`@trajectonomics/skills`).
- [`skills/internal`](skills/internal/AGENTS.md): the internal skills. Their source lives here, and `.agents/skills/` links to it.
- [`org/goals`](org/goals/AGENTS.md): the organisation's goals (`GOALS.md`).
- `tooling/`: shared Biome and TypeScript config (`tooling/config`) and the migration scripts (`tooling/migrate`).

## Rules

1. Never commit to `main`. Branch (`feat/*`, `fix/*`, `docs/*`) and open a PR. PR titles are conventional commits (`feat:`, `fix:`, `feat!:` ...).
2. Never commit secrets or `.env` files. Publishing tokens (`NPM_TOKEN`) live in repo secrets only; Cloudflare credentials live in Cloudflare (Workers Builds), never in this repository.
3. Bun only: `bun install`, `bun test`, `bun run <script>`. Do not add npm/pnpm/yarn lockfiles.
4. Package design: keep core packages pure and deterministic wherever applicable (data in, data out, no I/O, no clock, no unseeded randomness). Keep boundaries closed-world with explicit contracts.
5. Done means `bun run check` passes at the root (Turborepo). For one package, `bunx turbo run check --filter=<package>`. `bun run format` fixes formatting and import order. Do not loosen the shared config in `tooling/config`, a package's `biome.json`, or its `tsconfig` to make an error go away.
6. Never edit `version` in a `package.json` by hand and never run `npm publish` locally. Release versions are set by the release process.
7. Model & Pi (`pi.dev`) rules:
   - Never use `gemini-3.8-flash` anywhere; use `gemini-4-hydrogen` instead for Antigravity tasks and reviews (and `gemini-4-argon` where configured).
   - When running the Pi coding agent (`pi.dev`), strictly use **DeepSeek 4.1 Flash** only (e.g., `deepseek/deepseek-v4.1-flash`, `deepseek/deepseek-v4.1-flash-fast`), whether routed via Command Code GOAT (`command-code`) or OpenCode Go (`opencode`). Do not switch to or run any other models (Claude, GPT, Gemini, etc.) in Pi sessions for this repository. This rule is mechanically enforced via `.pi/settings.json`.
8. Temporary files and scratch clones: `/tmp` is a shared, nearly full tmpfs. Never use fixed `/tmp` filenames (use `mktemp`, or `--body-file -` for `gh` bodies), and never install `node_modules` or clone scratch repositories under `/tmp`. Verification clones go under `~/.cache/<slug>`.
9. Resource limits: run turbo with `--concurrency=2`, and wrap heavy builds in a memory cap, for example `systemd-run --user --scope -q -p MemoryMax=6G <command>`.

## Organisation goals

The organisation's goals are in [`org/goals/GOALS.md`](org/goals/GOALS.md). Read them before proposing a new direction. Only the owner edits that file; never edit it.

## Owner

Saving the owner's attention is part of the job, so finish a task instead of asking about it.

- Finish end-to-end: commit, push, open the PR, get an independent review, `gh pr merge` when the work is green or the owner said to proceed, then do the follow-up steps the change implies. Do not stop for small permission questions, and do not end with a `## Not done yet` list.
- When unsure, consult subagents on other models (`claude-sonnet-5-5`, `gemini-4-hydrogen`, `gemini-4-argon`, `deepseek-v4.1-flash`) instead of asking the owner. The model rules above still decide which one a session may itself run.
- Verify before calling something blocked: read live GitHub state (`gh issue view`, `gh pr view`) and the real CLI/API schema first.
- Keep replies short and lead with what only the owner must do; add detail when asked.
- Record every durable lesson here, in the package's `AGENTS.md` or in `docs/`, never only in agent memory.
- Settle your own T3 thread (`t3_thread_organize`, `action: "settle"`) when the work is done and nothing waits on the owner.

## Subagents

Delegate: the lead session plans, briefs, reviews the diffs and merges, and subagents do the legwork (reading, searching, editing, running checks). Brief each one with the files, the exact change and its completion criterion, because a subagent starts without your context. A Pi session keeps rule 7's DeepSeek-only models, and a package whose `AGENTS.md` names its own work model (such as `apps/site`) keeps it inside that package; this ladder is the default everywhere else.

Pick the cheapest model that can finish the brief:

1. `claude-haiku-5-5` for a Claude subagent (the `Agent` tool, `model: haiku`).
2. `opencode/deepseek-v4.1-flash-free` for a task on OpenCode (`delegate_task`). When it fails with the free usage limit, rerun the brief on `opencode-go/deepseek-v4.1-flash`.
3. A model from the Owner section's list (`claude-sonnet-5-5`, `gemini-4-hydrogen`, `gemini-4-argon`) only when a cheap one failed the brief, or for design and the independent review. The reviewer is a different model from the author.

A brief to a free model carries this repository's code and docs only: never a secret, a token or a person's financial data.

## Agent skills

### Where the skills come from

| Source | Lives in | Pinned | Used by |
|---|---|---|---|
| [`mattpocock/skills`](https://github.com/mattpocock/skills) (external) | `.agents/skills/<name>/` (real copy) | `skills-lock.json` | every agent |
| `RefoundAI/lenny-skills` (external, `goal-setting-okrs`) | `.agents/skills/goal-setting-okrs/` (real copy) | `skills-lock.json` | every agent |
| `trajectonomics/internal-skills` (internal) | `skills/internal/skills/<name>/`, linked from `.agents/skills/<name>` | not in the lock | every agent |
| First-party customer skills | `skills/customer/skills/<name>/` | `skills.manifest.json` | the product; never installed here |

- The canonical copy of every installed skill is `.agents/skills/` at the root. `.claude/skills/<name>` (Claude Code) and `.vibe/skills/<name>` (Mistral Vibe) are relative symlinks to `../../.agents/skills/<name>`, and `.grok/skills/goal-setting-okrs` is one more. Never edit the external copies or the symlinks by hand.
- Edit an internal skill in `skills/internal/skills/<name>/`, the source of truth. Its `.agents/skills/` entry is a symlink, so the change is picked up everywhere.
- A first-party customer skill is hand-edited in `skills/customer/skills/`. It is never in `skills-lock.json` and never copied into `.agents/skills/`: a lock entry would stop `npx skills add trajectonomics/trajectonomics/skills/customer --skill <name>` from installing it.
- Add a new skill: external skills through the Vercel `skills` CLI (below), which updates the lock; internal skills by adding the folder under `skills/internal/skills/` and the three symlinks.

### Commands

- Check: `bun run skills:check` (`bunx skills@latest check`)
- Update: `bun run skills:update` (`bunx skills@latest update`)
- Reinstall the external set: `npx skills add mattpocock/skills --skill '*' -a claude-code codex opencode antigravity-cli pi -y`
- Restore from the lock: `npx skills experimental_install`, then recreate the Claude Code and Vibe symlinks.

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

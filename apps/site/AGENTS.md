# AGENTS.md

Instructions for AI coding agents working in the `trajectonomics/site` repository, the Site at the root of trajectonomics.com.

## Rules

1. Never commit to `main`. Branch (`feat/*`, `fix/*`, `docs/*`) and open a PR.
2. Never commit secrets or `.env` files.
3. Design: keep the built-file checks in `src/lib/build/` and the probe check in `src/lib/probe/` pure (data in, data out, no I/O). Node, filesystem and network access lives in `scripts/`. The Site ships static HTML and CSS: no React, no Fumadocs, no client-side router ([ADR 0002](docs/adr/0002-site-worker-with-static-assets.md)).
4. Bun only: `bun install`, `bun test`, `bun run <script>`. Do not add npm/pnpm/yarn lockfiles.
5. Done means `bun run check` passes (Biome lint with zero warnings, strict typecheck, tests, the Astro build, the built-file checks and the local Worker probe). `bun run format` fixes formatting and import order. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
6. This repository is private and never published to npm: do not add a release workflow or a publish surface. Never edit `version` in `package.json`. PR titles are conventional commits (`feat:`, `fix:`, `feat!:` ...).
7. Model & Pi (`pi.dev`) rules:
   - Never use `gemini-3.8-flash` anywhere; use `gemini-4-hydrogen` instead for Antigravity tasks and reviews (and `gemini-4-argon` where configured).
   - When running the Pi coding agent (`pi.dev`), strictly use **DeepSeek 4.1 Flash** only (e.g., `deepseek/deepseek-v4.1-flash`, `deepseek/deepseek-v4.1-flash-fast`), whether routed via Command Code GOAT (`command-code`) or OpenCode Go (`opencode`). Do not switch to or run any other models (Claude, GPT, Gemini, etc.) in Pi sessions for this repository. This rule is mechanically enforced via `.pi/settings.json`.
   - Subagents do the work on a work model: **`deepseek-v4.1-flash`** (Pi) or **`mistral-large-4`** (Mistral Vibe). The expensive models (`claude-*`, `gemini-*`, `grok-*`) are for consultation, review and debugging help only, never for routine implementation.
8. Temporary files and scratch clones: `/tmp` is a shared, nearly full tmpfs. Never use fixed `/tmp` filenames (`mktemp` for small files; `--body-file -` for `gh` bodies) and never install `node_modules` or clone scratch repos under `/tmp`; use `~/.cache/<slug>`.

## Organisation goals

The organisation's goals are in https://github.com/trajectonomics/goals, `GOALS.md`. Read them before proposing a new direction. Only the owner edits that file; never edit it.

## Owner

Save the owner's attention: finish everything agents can handle end-to-end (commit, push, PR, independent review, `gh pr merge` when green or told to proceed, follow-up steps) without stopping for small permission questions or `## Not done yet` lists.

When unsure, consult subagents on other models (`claude-sonnet-5-5`, `gemini-4-hydrogen`, `gemini-4-argon`, `deepseek-v4.1-flash`) instead of asking the owner. Escalate to the owner only for genuinely important, hard-to-reverse, product/policy, or human-only (accounts, credentials, browser/UI) decisions.

Verify live GitHub state (`gh issue view`, `gh pr view`) and CLI/API schemas before claiming something is blocked or unsupported. Keep owner replies short (lead with what only the owner must do), record durable lessons in repo instructions rather than agent memory, and settle your own T3 thread (`t3_thread_organize`, `action: "settle"`) when done and nothing waits on the owner.

## Agent skills

### Skills included in this repository

- **Matt Pocock Skills (`mattpocock/skills`)**: Complete engineering workflow including `/ask-matt`, `/tdd`, `/implement`, `/code-review`, `/wayfinder`, `/diagnosing-bugs`, `/codebase-design`, `/grill-with-docs`, etc.
- **Trajectonomics Internal Skills (`trajectonomics/internal-skills`)**: Organization-specific workflow including `/pick-the-issue` to discover unblocked GitHub issues not currently handled by active T3 Code sessions and route them into the `ask-matt` framework.

### Reviewing a diff

`CODING_STANDARDS.md`: the conventions `bun run check` cannot enforce. Read it when reviewing, not when implementing.

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Installing and updating skills

Skills come from [`mattpocock/skills`](https://github.com/mattpocock/skills) and [`trajectonomics/internal-skills`](https://github.com/trajectonomics/internal-skills) via the Vercel [`skills`](https://github.com/vercel-labs/skills) CLI and are pinned in `skills-lock.json`. The canonical copy is `.agents/skills/` (read natively by Codex, OpenCode, Pi, and Antigravity CLI); `.claude/skills/` holds symlinks into it for Claude Code, and `.vibe/skills/` holds `../../.agents/skills/<name>` symlinks into it for Mistral Vibe ([factory#80](https://github.com/trajectonomics/factory/pull/80)). Never edit them by hand.

- Update: `bun run skills:update` (or `npx skills update -p -y`)
- Check status: `bun run skills:check` (or `npx skills check`)
- Reinstall:
  ```bash
  npx skills add mattpocock/skills --skill '*' -a claude-code codex opencode antigravity-cli pi -y
  npx skills add trajectonomics/internal-skills -y
  ```
- Restore from the lock: `npx skills experimental_install`

## Factory Runs

A Factory Run or Spec drafter (a thread titled `traj/trajectonomics/<repo>#<n>` or `triage/trajectonomics/<repo>#<n>`) takes its instructions from the Dispatcher runbook in `trajectonomics/factory`, never from this repository, where `docs/dispatcher-runbook.md` does not exist. Read it with `gh api repos/trajectonomics/factory/contents/docs/dispatcher-runbook.md -H "Accept: application/vnd.github.raw"`. If you cannot read it, stop and say so; do not build from the issue alone.

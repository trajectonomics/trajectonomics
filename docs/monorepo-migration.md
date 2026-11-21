# Monorepo migration plan

Move the `trajectonomics` org's repos into this repo (`trajectonomics/trajectonomics`) as one
Bun workspace, keeping each repo's git history, its npm package names, and its Cloudflare worker names.

Status: **decisions made (§1); phase 1 in progress.** Inventory taken 2026-11-21: 22 repos, 0 open PRs.

## 0. Why this is cheaper than it looks

Every repo already uses the same stack: `bun@1.4.4`, Biome 2.6.3, TypeScript 7, tsdown, the
shared `@trajectonomics/tooling` package, and thin CI callers into `trajectonomics/cicd`.
`design-system` already runs a mini monorepo (Bun workspaces, one release workflow per package,
tag prefixes such as `core-v`). The migration takes that pattern and applies it to the whole org.

What goes away after the move:

| Today | After |
|---|---|
| `@trajectonomics/tooling` pinned at 1.1.0 in some repos and 1.3.0 in others, plus a weekly `drift.yml` in each repo | one `workspace:*` dependency, no drift job |
| Internal deps pinned to published alphas (`sim 0.2.0-alpha.17`, `tax 0.2.0-alpha.6`, ...) | `workspace:*`, so a change and the code that uses it land in one PR |
| `docs` waits for a `repository_dispatch` from cicd after an upstream release | docs builds against the source in the same commit |
| Reusable workflows called at `trajectonomics/cicd/...@v1` | local workflows in `.github/workflows/` |
| 20+ copies of `AGENTS.md`, `CODING_STANDARDS.md`, `GLOSSARY.md`, `skills-lock.json`, `.agents/.claude/.pi/.vibe` skill dirs | one copy at the root; a package keeps an `AGENTS.md` only for what is specific to it |

## 1. Decisions (2026-11-21)

1. **Private repos stay separate.** This repo is public, so `infra`, `web-router`, `growth` and
   `external-comm` stay out of it. `web-router` keeps its own Cloudflare project.
2. **`agentic-inbox` (a fork of `cloudflare/agentic-inbox`) and `mcp-auth-gateway` (Docker image) stay separate.**
3. **History is kept**, as described below.
4. **Old repos get archived** after cutover, each with a README that points here. Nothing gets deleted.

### How history is kept

For each repo, starting from a fresh clone of its `main`:

1. `uvx git-filter-repo --to-subdirectory-filter <dest> --tag-rename ':<prefix>-'` rewrites every
   commit so the files already live under `<dest>` (for example `packages/sim/src/...`), and renames its tags
   (`v0.2.0` → `sim-v0.2.0`). Authors, dates and messages stay the same. Only the SHAs change.
2. In this repo: `git fetch <rewritten clone> main` and then
   `git merge --allow-unrelated-histories` bring that whole rewritten history in as a second parent.

The result: `git log -- packages/sim`, `git blame` and `git log --follow` all show the original
commits. The rewrite is deterministic, so re-running the script on the same input produces the same SHAs.

Two rules keep the history:

- **Merge the import PR with "Create a merge commit".** A squash or rebase merge throws the imported history away.
- **Push tags after the merge**, from `tooling/migrate/tags.txt` (tag → SHA), because a PR does not carry tags.

## 2. Target layout

```
apps/
  site/              <- site          (worker "site")
  docs/              <- docs          (worker "docs")
  blog/              <- blog          (worker, not deployed yet)
  cli/               <- cli           (npm @trajectonomics/cli + 5 binaries)
  factory/           <- factory
  storybook/         <- design-system/apps/storybook
packages/
  money/             <- money         (@trajectonomics/money)
  ledger/            <- ledger-core   (@trajectonomics/ledger)
  tax/               <- tax-core      (@trajectonomics/tax)
  sim/               <- sim-core      (@trajectonomics/sim)
  copy-engine/       <- copy-engine
  design-system/     <- design-system (imported whole in phase 1; its
                        packages/* stay nested, storybook moves to apps/ in phase 2)
  tooling/           <- cicd          (@trajectonomics/tooling; scripts/ and the
                        reusable workflows move out in phases 2 and 5)
skills/
  customer/          <- skills           (the published agent skills)
  internal/          <- internal-skills
org/
  goals/             <- goals            (GOALS.md stays the source of truth Factory reads)
tooling/
  migrate/           import script + tags manifest
  templates/package/ <- technical-template
.github/workflows/   <- merged CI, release, deploy
```

Not moved (§1): `agentic-inbox`, `mcp-auth-gateway`, and the private
`infra`, `web-router`, `growth`, `external-comm`. `technical-template` is retired: a new package
becomes a folder plus a `bun run new:package <name>` script, not a new repo. Its history gets
imported to `tooling/templates/package/` so nothing is lost.

## 3. Known problems to fix during the move

- **Cycle between `sim` and `tax`.** `sim` has a peer dependency on `tax`, and `tax` has a dev
  dependency on `sim` (for its tests). Turborepo rejects cyclic task graphs. Fix: move the tax tests
  that use `sim` into `packages/sim` (or into a new `packages/integration-tests`). Then `tax` stops
  depending on `sim` entirely.
- **Wrong package names.** `blog`, `copy-engine` and `external-comm` still call themselves
  `@trajectonomics/technical-template`. Rename them to `@trajectonomics/blog` (private) and
  `@trajectonomics/copy-engine` before wiring the workspace, or the workspace will fail with a
  duplicate-name error.
- **Different Node engine.** `site` requires Node `>=22.23.4`; everything else requires `>=20`. The root
  sets `>=22.23.4`.
- **`docs` pins old versions.** It uses `sim 0.1.0` and `design-system-assets 0.1.0-alpha.2`. Moving to
  `workspace:*` may break the docs build. That is a real error the old setup was hiding, and it gets
  fixed during the move.

## 4. Tooling

- **Workspaces:** Bun (`"workspaces": ["apps/*", "packages/*", "packages/design-system/packages/*", "skills/*", "org/*"]`),
  one `bun.lock`.
- **Task runner:** Turborepo, for `check`/`build`/`test` with caching and `--affected` on PRs. Every
  package already has `check`, `build`, `test`, `lint` and `typecheck` scripts, so `turbo.json` stays small.
- **Biome/TS:** a root `biome.json` and `tsconfig.base.json` that extend `packages/tooling`. Delete
  per-package copies unless they differ, and record any difference in the package's `AGENTS.md`.
- **Agent skills:** one root `skills-lock.json` and one root set of `.agents/.claude/.pi/.vibe/skills`.
  Nested `AGENTS.md` files stay where a package needs them.

## 5. CI and release

**CI (`ci.yml`):** on PRs, `bun install --frozen-lockfile && turbo run check --affected`. On main,
the full run. Also keep `pr-title.yml` (conventional commits, now with a required scope equal to the
package folder, e.g. `feat(sim): ...`).

**Release:** generalize `design-system`'s `release-package.yml` (it already takes
`package-folder`, `tag-prefix` and `extra-paths`, and only counts commits that touch the
package folder):

- push to main → for each publishable package whose folder changed, publish an alpha (dist-tag `alpha`).
- `workflow_dispatch` with a `package` and `bump` → stable release, tag `<name>-vX.Y.Z`, GitHub
  release named after the package.
- Publishable packages: money, ledger, tax, sim, cli, tooling, design-system{,-theme,-svelte,-assets},
  copy-engine.
- Publish order follows the dependency graph (money → ledger/tax → sim → cli). `workspace:*` gets
  replaced by the real version at publish time (`bun publish` does this).
- **Old tags:** imported tags are renamed with the package prefix (`v0.2.0` in sim-core →
  `sim-v0.2.0`), so `version.ts` keeps counting from the last release.
- **cli:** `binaries.yml` and `installer-smoke.yml` move over with path filters on `apps/cli/**`,
  triggered after a stable `cli-v*` release. `install.sh` / `install.ps1` download from GitHub releases:
  change them to read the latest `cli-v*` tag, not the latest release, because other packages now
  create releases in the same repo.

**Needs you (npm):** npm trusted publishing checks the repo and workflow filename. For each
published package, edit its Trusted Publisher on npmjs.com to repository
`trajectonomics/trajectonomics`, workflow `release.yml`. Until you do, releases from here will fail
with an auth error. The old repos keep working until they are archived.

## 6. Cloudflare deploys (your part)

No repo deploys from GitHub Actions today, so these are Cloudflare Workers Builds connected to
each repo. Point each worker at this repo:

| Worker | Root directory | Build command | Deploy command | Build watch paths |
|---|---|---|---|---|
| `site` | `apps/site` | `bun install --frozen-lockfile && bun run build` | `bunx wrangler deploy` | `apps/site/**`, `packages/design-system/**`, `bun.lock` |
| `docs` | `apps/docs` | `bun install --frozen-lockfile && bun run build` | `bunx wrangler deploy` | `apps/docs/**`, `packages/**`, `bun.lock` |
| `trajectonomics-web-router` | (stays in its own repo unless §1.1 changes) | | | |

Worker names do not change, so the router's service bindings (`DOCS` → `docs`, `HOME` → `site`) keep
working. Run `bun install` from the repo root: Workers Builds runs inside the root directory, and
Bun finds the workspace root by walking up.

Alternative: deploy from GitHub Actions with `wrangler deploy` and a `CLOUDFLARE_API_TOKEN` secret.
That puts deploys next to CI and the release workflows. Cloudflare Workers Builds is fine too, and
needs no secrets in GitHub.

## 7. Phases

Each phase is one PR into `main`. The agent stops after each phase for review.

| # | Phase | Agent | Check before moving on |
|---|---|---|---|
| 1 | **Import with history**: script `tooling/migrate/import.sh` runs `git filter-repo --to-subdirectory-filter <dest> --tag-rename ':<prefix>-'` on a fresh clone of each repo, then `git merge --allow-unrelated-histories`. No content edits. | DeepSeek V4.1 Flash | `git log --follow` works for a file in each package; tag count matches the source repos |
| 2 | **Workspace wiring**: root `package.json`, `turbo.json`, root biome/tsconfig, rename the wrong package names, internal deps → `workspace:*`, break the sim↔tax cycle, delete duplicate configs | DeepSeek V4 Pro | `bun install && turbo run check build test` passes from a clean clone |
| 3 | **Agent docs and skills**: merge `AGENTS.md`/`CLAUDE.md`/`CODING_STANDARDS.md`/`GLOSSARY.md` into the root, one skills lock | DeepSeek V4.1 Flash | No duplicate root skill dirs; `bun run skills:check` passes |
| 4 | **CI**: `ci.yml` + `pr-title.yml` with turbo affected; delete per-package workflows | DeepSeek V4 Pro | A PR touching only `packages/money` runs only money and its dependents |
| 5 | **Release**: generalized `release.yml`, CLI binaries, installer tag lookup | DeepSeek V4 Pro, reviewed by Opus | Dry-run publish (`npm publish --dry-run`) of every package in dependency order |
| 6 | **Cutover**: you update the npm Trusted Publishers and Cloudflare projects. The agent then opens archive-notice PRs in the old repos | You + DeepSeek Flash | A stable release of `money` from here; site and docs deploy from here |
| 7 | **Archive** the old repos | You | — |

During phases 1–5 the old repos stay live. Freeze merges into them from the start of phase 1 until
cutover, or re-run the phase 1 import script (it is idempotent and works from fresh clones) just before phase 6.

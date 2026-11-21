# Monorepo migration plan

Move the `trajectonomics` org's repos into this repo (`trajectonomics/trajectonomics`) as one
Bun workspace, keeping each repo's git history, its npm package names, and its Cloudflare worker names.

Status: **phase 1 (import) done on branch `monorepo/phase-1-import`; phase 2 next.** Inventory taken 2026-11-21: 22 repos, 0 open PRs.

## 0. Why this is cheaper than it looks

Every repo already uses the same stack: `bun@1.4.4`, Biome 2.6.3, TypeScript 7, tsdown, the
shared `@trajectonomics/tooling` package, and thin CI callers into `trajectonomics/cicd`.
`design-system` already runs a mini monorepo (Bun workspaces, one release workflow per package,
tag prefixes such as `core-v`). The migration applies that pattern to the whole org.

What goes away after the move:

| Today | After |
|---|---|
| `@trajectonomics/tooling` pinned at 1.1.0 in some repos and 1.3.0 in others, plus a weekly `drift.yml` in each repo | Biome and TS config live at this repo's root; the `tooling` package and the drift jobs go away |
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
5. **Also not moved:** `copy-engine` (already moved out), `cicd` (config lives in this repo instead;
   only the release scripts it holds, `version.ts` and `release-plan.ts`, get copied in during phase 5),
   `factory` (becomes a skill, a separate task after the migration), and `technical-template`.
6. **`design-system` becomes `packages/brand`**, a package in this repo built for white-label themes (§2a, §2b).
   It is **not published to npm**.
7. **Only two npm packages:** `@trajectonomics/core` (money, ledger, tax and sim as subpath exports)
   and `@trajectonomics/cli`. Then `money`, `ledger`, `tax`, `sim` and the four `design-system*` packages get
   `npm deprecate`d with a pointer to the replacement. Versions already published keep installing. (§2c)
8. **White-label goes through private mirror repos** (§2b), not through npm.
9. **Docs:** remove the "Build on Trajectonomics" section and add a contributor guide aimed at people
   who contribute tax rules. (§2d)

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
packages/
  core/              @trajectonomics/core, published (§2c)
    money/           <- money         (imported to packages/money in phase 1, git mv'd here)
    ledger/          <- ledger-core
    tax/             <- tax-core      (the main area for outside contributors, §2d)
    sim/             <- sim-core
  brand/             <- design-system (white-label themes, not published, §2b)
skills/
  customer/          <- skills           (the published agent skills)
  internal/          <- internal-skills
org/
  goals/             <- goals
tooling/
  migrate/           import script + tags manifest
  release/           version.ts, release-plan.ts copied from cicd (phase 5)
biome.json, tsconfig.base.json   root config, replaces @trajectonomics/tooling
.github/workflows/   merged CI, release
```

Not moved (§1): `agentic-inbox`, `mcp-auth-gateway`, `copy-engine`, `cicd`, `factory`,
`technical-template`, and the private repos `infra`, `web-router`, `growth`, `external-comm`.

### 2a. Is design-system needed?

What site and docs actually import (2026-11-21):

| design-system package | Used by | What for |
|---|---|---|
| `design-system-theme` | site, docs | `themes/light.css`, `themes/dark.css`, `tailwind.css`, `typography.css` |
| `design-system-assets` | site, docs | logo SVG, favicon set, Inter/Aleo/Azeret fonts |
| `design-system` (core) | only indirectly | the tokens that `theme`'s build turns into those CSS files |
| `design-system-svelte` + Storybook | **nothing** | site and docs are Astro, and neither imports a Svelte component |

So the parts in use are a few CSS files and some static brand files. The rest is a four-package
system with its own npm releases. About 200 lines of Svelte, plus Storybook, Vitest and a Prettier
setup, have no consumer.

**Decision (2026-11-21):** import design-system's history into `packages/brand` and make it one
package in this repo, **not published to npm**. Drop the Svelte package and Storybook;
they stay readable in the archived repo. Core and theme exist so we can add themes and white-label
the product for other companies, and `brand` keeps that ability and makes it easier.

### 2b. `packages/brand` for white-label

Today, adding a theme means touching `core/src/themes/<name>.ts`, `core/src/themes.ts` and the
theme package's prebuilt CSS list, and logos and fonts only exist for Trajectonomics. Instead, a
**brand is a folder**:

```
packages/brand/                 @trajectonomics/brand (private, not published)
  src/
    tokens/                     contract, primitives, semantic tokens, contrast (from core/src)
    theme/                      defineTheme, validation, themeToCss (from theme/src)
    index.ts                    the public API
  brands/
    trajectonomics/
      light.ts                  export default <Theme named "light">
      dark.ts                   export default <Theme named "dark">
      assets/svg/  assets/webp/ (from brand-source)   assets/fonts/ (from assets/fonts)
    acme/                       a white-label customer: copy the folder, change tokens and assets
  tailwind.css, typography.css  brand-agnostic: they only reference --ds-* variables
  scripts/build.ts              finds brands/*, writes dist/brands/<brand>/{light.css,dark.css,logo/,favicon/,fonts/},
                                and copies the brand named by BRAND (default trajectonomics) to dist/current/
```

- **Theme names stay `light` and `dark` inside every brand.** `themeToCss` scopes the CSS to
  `[data-theme="<name>"]`, and apps set `data-theme="light"` or `"dark"`. The folder name is the brand.
- **Adding a brand = adding a folder.** The build and the tests find `brands/*` themselves.
  Nothing gets registered by hand.
- **Every brand is tested automatically.** A test runs over every folder in `brands/*` and fails if
  a theme breaks the Semantic Token Contract, misses the WCAG AA contrast floor (the check core has
  today), or lacks a required asset (logo mark, favicon set, fonts stylesheet).
- **Exports:** `@trajectonomics/brand` (the JS API: `defineTheme`, `themeToCss`, the contract,
  primitives, the brand list), `@trajectonomics/brand/brands/<brand>/...`,
  `@trajectonomics/brand/current/...`, `@trajectonomics/brand/tailwind.css` and `@trajectonomics/brand/typography.css`.
- **Picking a brand in an app:** site and docs import from `@trajectonomics/brand/current/...`.
  `BRAND=acme bun run build` builds the same apps as Acme. `turbo.json` lists `BRAND` in the build
  task's `env`, so the cache never mixes brands. A white-label deploy is one more Cloudflare worker
  with `BRAND` set. Nothing in the code is forked.
- **White-label for a company = a private mirror of this repo.** GitHub won't make a private fork of
  a public repo, so: create a private repo `trajectonomics/<company>`, push this repo into it, and
  add this repo as `upstream` (the same setup `agentic-inbox` has with `cloudflare/agentic-inbox`).
  - The private repo **only adds**: `packages/brand/brands/<company>/` and that company's worker
    config. Any change to shared code is made here, in public, and pulled down.
  - Keeping to that makes syncing a conflict-free `git merge upstream/main`. A scheduled workflow in
    the private repo does it every day and opens a PR if the merge does not apply cleanly.
  - The private repo deploys its own Cloudflare worker built with `BRAND=<company>`.

### 2c. One published package: `@trajectonomics/core`

Outside this repo, only `cli` and `docs` import money, ledger, tax and sim (about 100 import sites).
npm shows about 2–4k downloads a month each, and the CLI itself only 681, so this is mostly our own
CI and Cloudflare builds. Five packages with their own versions and trusted publishers cost more
than they give.

- `packages/core/` with subpath exports: `@trajectonomics/core/money`, `/ledger`, `/tax`,
  `/tax/th`, `/tax/us`, `/sim`. The four folders keep their source and tests. Each one's history
  comes in through the phase 1 import, then a `git mv` (history still shows with `git log --follow`).
- **Dependency direction checked by lint:** `ledger` and `tax` may import `money`. `sim`
  imports none of the others. `tax`'s production code never imports `sim`, but its levy tests may,
  because they evaluate the levy graph `tax` emits with sim's evaluator. Nothing imports upward. Each folder stays pure (no I/O, no clock, no unseeded randomness) as the old packages
  promised. A Biome `noRestrictedImports` rule per folder, or a small script, enforces both.
- The sim↔tax cycle (§3) is gone by then: phase 2 drops sim's unused optional peer dependency on tax.
- `cli` and `docs` change imports: `@trajectonomics/sim` → `@trajectonomics/core/sim`, and so on.
- Release: two published packages, `core` (tags `core-v*`) and `cli` (tags `cli-v*`). Old tags
  imported from money/ledger/tax/sim keep their prefixes as history. The `core` version starts at `0.3.0`,
  higher than any old package's `latest`, so nobody mistakes the two.

### 2d. Docs: drop "Build on Trajectonomics", add a tax contributor guide

`apps/docs` today has two sections: `cli` (for users) and `developers`, titled
"Build on Trajectonomics", with one page per package (sim-core, ledger-core, tax-core, design-system).
With only `core` and `cli` published and no developer audience to serve, that section goes.

- **Remove** `src/content/docs/developers/**` and its sidebar entry. Add **301 redirects** in the docs
  worker from `/docs/developers/*` to `/docs/contribute/` (or to `/docs/contribute/tax/` for
  `tax-core` pages), so old links and search results still land somewhere.
- **Remove** `sync-release.yml` (the upstream-release dispatch from cicd). The docs now build against
  the source in the same commit.
- **Add a `contribute` section** with two pages:
  - `/docs/contribute/`: a short general guide (clone, `bun install`, `bun run check`, PR title scope).
  - `/docs/contribute/tax/`: **the main page.** See the outline below.
- **One source, no copies:** the tax guide's text lives in `packages/core/tax/CONTRIBUTING.md`
  (GitHub shows it to people browsing the code), and the docs page imports that file. A root
  `CONTRIBUTING.md` covers the general flow and links to the tax guide first.

**Outline of the tax contributor guide.** Every rule comes from how tax-core already works:

1. **Who this is for:** accountants, tax practitioners and developers who know a jurisdiction's
   rules. You do not need to know the rest of the codebase.
2. **What you can contribute**, from easiest to hardest:
   - report a wrong figure (an issue template that requires a link to the official source),
   - update a figure for a new tax year (brackets, allowances, caps),
   - add worked examples from official documents to the test corpus,
   - add a US state,
   - add a new country.
3. **The source rule.** Every statutory figure cites an official document. The citation is a row in
   `references/<jurisdiction>/SOURCES.md` (URL, local file name, date read, result).
   `bun run check:th-sources` fails when a parameter has no row or a row has no parameter. Raw
   documents are git-ignored. Only the manifest is committed.
4. **How the code is organised:** parameters (data) are kept apart from stages (logic). Money is
   integer minor units with statutory rounding and clamping (ADR-0002). Fields are typed and stages
   are isolated (ADR-0003). Each jurisdiction is a subpath export (ADR-0001). Link the ADRs, don't copy them.
5. **Walkthroughs:** (a) a new Thai tax year, from the Revenue Department source to a parameters
   change, a SOURCES row and a corpus test; (b) a new country, from a folder skeleton to the
   `@trajectonomics/core/tax/<cc>` export and a first source-backed test.
6. **Checking your change:** `bun run check --filter=@trajectonomics/core`. What each failure means:
   hardcoded-string check, source check, coverage floor, README claims check.
7. **Review:** PR title `feat(tax): ...` or `fix(tax): ...`. A reviewer re-checks every changed
   figure against its cited source. `CODEOWNERS` routes `packages/core/tax/**` to the tax reviewers.

Also add to `.github/`: issue templates `tax-wrong-figure.yml`, `tax-new-year.yml` and
`tax-new-jurisdiction.yml` (each with a required "official source URL" field), a `tax` label, and
`CODEOWNERS`.

## 3. Known problems to fix during the move

- **Cycle between `sim` and `tax`.** `sim` declares an *optional* peer dependency on `tax`, but its
  source never imports `tax`. `tax` has a dev dependency on `sim`, because its levy tests evaluate the
  emitted graph with sim. Fix (phase 2): drop sim's unused peer entry. The only edge left is
  tax → sim, test-only.
- **Wrong package name.** `blog` still calls itself `@trajectonomics/technical-template`. Rename it
  to `@trajectonomics/blog` (private).
- **Different Node engine.** `site` requires Node `>=22.23.4`; everything else requires `>=20`. The root
  sets `>=22.23.4`.
- **`docs` pins old versions.** It uses `sim 0.1.0` and `design-system-assets 0.1.0-alpha.2`. Moving to
  `workspace:*` may break the docs build. That is a real error the old setup was hiding, and it gets
  fixed during the move.
- **Dependencies on `@trajectonomics/tooling`.** Every package has it as a dev dependency and extends
  its Biome and TS presets. Phase 2 copies the presets into the root config and removes the dependency.

## 4. Tooling

- **Workspaces:** Bun (`"workspaces": ["apps/*", "packages/*", "skills/*", "org/*"]`),
  one `bun.lock`.
- **Task runner:** Turborepo, for `check`/`build`/`test` with caching and `--affected` on PRs. Every
  package already has `check`, `build`, `test`, `lint` and `typecheck` scripts, so `turbo.json` stays small.
- **Biome/TS:** a root `biome.json` and `tsconfig.base.json`, copied from `@trajectonomics/tooling`'s
  presets and then owned here. Delete per-package copies unless they differ, and record any
  difference in the package's `AGENTS.md`.
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
- Publishable packages: `core` and `cli` only.
- Publish order: core, then cli. `workspace:*` gets
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
| `site` | `apps/site` | `bun install --frozen-lockfile && bun run build` | `bunx wrangler deploy` | `apps/site/**`, `packages/brand/**`, `bun.lock` |
| `docs` | `apps/docs` | `bun install --frozen-lockfile && bun run build` | `bunx wrangler deploy` | `apps/docs/**`, `packages/core/**`, `packages/brand/**`, `bun.lock` |
| `trajectonomics-web-router` | stays in its own repo, unchanged | | | |

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
| 1 | **Import with history** (done 2026-11-21): `tooling/migrate/import.sh` imported 12 repos (design-system as `packages/brand`), 476 commits and 9 tags, in 33 s. No content edits. | Claude, as a script: the job is mechanical | Done: each folder's contents match the source repo's latest commit and every commit count is exact; re-running changes nothing; no secrets in history |
| 2 | **Workspace wiring**: root `package.json`, `turbo.json`, root biome/tsconfig (from tooling's presets), drop the `@trajectonomics/tooling` dependency, rename blog, internal deps → `workspace:*`, break the sim↔tax cycle, delete duplicate configs | DeepSeek V4 Pro | `bun install && turbo run check build test` passes from a clean clone |
| 2b | **Brand package**: restructure `packages/brand` per §2b, delete the Svelte package and Storybook, switch site and docs to `@trajectonomics/brand` with `BRAND` selection | DeepSeek V4 Pro, reviewed by Opus | site and docs build pixel-identical with `BRAND=trajectonomics`; a throwaway `brands/example` passes the tests without touching any other file |
| 2c | **Core package**: `git mv` money/ledger/tax/sim into `packages/core/`, subpath exports, import-direction lint, update cli and docs imports | DeepSeek V4 Pro | `bun run check` passes; `npm pack --dry-run` of core shows every subpath; a test import that goes upward fails lint |
| 3 | **Agent docs and skills**: merge `AGENTS.md`/`CLAUDE.md`/`CODING_STANDARDS.md`/`GLOSSARY.md` into the root, one skills lock | DeepSeek V4.1 Flash | No duplicate root skill dirs; `bun run skills:check` passes |
| 3b | **Docs and contributing**: remove the developers section and add redirects, add the contribute section, the tax guide (§2d outline), issue templates, CODEOWNERS | DeepSeek V4 Pro, reviewed by Opus | Old `/docs/developers/*` URLs answer 301; the tax guide's walkthrough works step by step on a clean clone |
| 4 | **CI**: `ci.yml` + `pr-title.yml` with turbo affected; delete per-package workflows | DeepSeek V4 Pro | A PR touching only `apps/site` runs only site checks; one touching `packages/core` runs core, cli and docs |
| 5 | **Release**: generalized `release.yml`, CLI binaries, installer tag lookup | DeepSeek V4 Pro, reviewed by Opus | Dry-run publish (`npm publish --dry-run`) of every package in dependency order |
| 6 | **Cutover**: you publish `@trajectonomics/core` once by hand (a new name), set its trusted publisher, move `cli`'s trusted publisher here, deprecate the old npm packages, and update the Cloudflare projects. The agent then opens archive-notice PRs in the old repos | You + DeepSeek Flash | A stable release of `money` from here; site and docs deploy from here |
| 7 | **Archive** the old repos | You | — |

### Rules for delegated phases

A DeepSeek agent ran the first try at phase 1. It ran `git filter-repo` in the parent checkout, not in
its own worktree, and rewrote local branches it did not own (including another thread's base). It
repaired most of the damage itself, then got cancelled, and the import was redone as a script. Every
delegated phase brief from now on states:

- Work only inside the worktree path the brief gives. Never `cd` to `/home/prame/trajectonomics` or
  any other checkout. Never touch branches other than the phase branch.
- No history-rewriting commands (`filter-repo`, `filter-branch`, `rebase` of shared branches,
  `reset --hard` to other refs, `update-ref` outside the phase branch, force push).
- One phase per run. Push the phase branch and open a draft PR. Do not merge.
- Mechanical, checkable work (imports, tag pushes, mass renames that a script can do) gets a script,
  not an agent.

During phases 1–5 the old repos stay live and keep deploying. **Freeze merges into them now.** If a
change has to land before cutover, make it here as a normal commit. (`import.sh` skips folders that
already exist, so re-running it does not pick up late changes in an old repo.)

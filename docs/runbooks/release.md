# Release runbook

Two npm packages ship from this repository: `@trajectonomics/core` (`packages/core`) and
`@trajectonomics/cli` (`apps/cli`). Their tags are `core-v*` and `cli-v*`. The packages and their
tag prefixes are listed in `tooling/release/packages.json`. Workflow: `.github/workflows/release.yml`.

## How versions happen

- **Alpha, on push to main.** A package whose folder changed gets `<next>-alpha.N` under dist-tag
  `alpha`. Markdown-only changes publish nothing. `tooling/release/version.ts` computes it.
- **Stable, by hand.** From main, for one package: publishes `<next>` under dist-tag `latest`, then
  creates the tag `<tagPrefix><next>` and a GitHub release. Only `cli` is marked latest.
- **Bump.** `auto` reads the conventional commits that touched the folder since the last stable
  tag (`feat` minor, breaking major, else patch). Pass `patch`, `minor` or `major` to override.
- **First stable.** With no stable tag yet, a package takes `firstVersion` from `packages.json`
  (`core`: `0.3.0`), and its alphas are `0.3.0-alpha.N`.

## Dispatch a stable release

```sh
gh workflow run release.yml --ref main -f package=core -f bump=auto
gh workflow run release.yml --ref main -f package=cli -f bump=patch
```

`auto` fails with "Nothing to release" when the folder has no commits since the last tag.

## Repair a cli release's binaries

If the stable cli publish worked but `binaries.yml` failed, rebuild the assets from the tag
(nothing is published):

```sh
gh workflow run binaries.yml --ref main -f tag=cli-v0.3.1
```

It refuses a tag that is not `cli-vX.Y.Z`, then smoke-tests and uploads the binaries.

## One-time cutover (owner)

Do these once, in order. Nothing runs before (c): `release.yml` does nothing until the repository
variable `RELEASES_ENABLED` is `true`, so merging to main cannot publish by accident.

**(a) Publish core once by hand at `0.3.0-alpha.0`.** npm cannot attach a Trusted Publisher to a
package that does not exist yet. From a clean checkout of main:

```sh
bun install --frozen-lockfile
bunx turbo run check --filter=@trajectonomics/core... --concurrency=2
cd packages/core
npm pkg set version=0.3.0-alpha.0
npm pkg delete devDependencies
mkdir -p ~/.cache/release && bun pm pack --destination ~/.cache/release
npm login
npm publish ~/.cache/release/trajectonomics-core-0.3.0-alpha.0.tgz --access public --tag alpha --provenance=false
git checkout -- package.json
```

`--provenance=false`: `publishConfig` asks for provenance, which only CI can give.

**(b) Trusted Publishers.** On npmjs.com, for both packages: Settings → Trusted Publisher →
GitHub Actions, repository `trajectonomics/trajectonomics`, workflow `release.yml`, no environment.
For `cli`, replace the old `trajectonomics/cli` publisher.

**(c) Turn releases on.** `gh variable set RELEASES_ENABLED --body true -R trajectonomics/trajectonomics`.
From here every push to main publishes alphas. Turn it off again with `--body false`.

**(d) First stable of each.** Dispatch the workflow for `core` (it publishes `0.3.0`, tag
`core-v0.3.0`) and for `cli` with `bump=auto`. Expect cli `0.4.0`: cli counts `packages/core` as
its own (its binaries bundle core), and core's imported history after `cli-v0.3.0` holds `feat`
commits. That release is also the first one whose binaries live in this repository, so do it before
the docs and site deploy from here (their install lines point at this repository's releases).
Check that `latest` on npm is what you expect: `npm view @trajectonomics/core dist-tags`.

**(e) Deprecate the retired packages.** Each command marks every version of the old package:

```sh
npm deprecate @trajectonomics/money "Moved into @trajectonomics/core (import @trajectonomics/core/money). No longer published."
npm deprecate @trajectonomics/ledger "Moved into @trajectonomics/core (import @trajectonomics/core/ledger). No longer published."
npm deprecate @trajectonomics/tax "Moved into @trajectonomics/core (import @trajectonomics/core/tax). No longer published."
npm deprecate @trajectonomics/sim "Moved into @trajectonomics/core (import @trajectonomics/core/sim). No longer published."
npm deprecate @trajectonomics/design-system "Retired. Source is packages/brand in github.com/trajectonomics/trajectonomics; not published."
npm deprecate @trajectonomics/design-system-theme "Retired. Source is packages/brand in github.com/trajectonomics/trajectonomics; not published."
npm deprecate @trajectonomics/design-system-svelte "Retired. Source is packages/brand in github.com/trajectonomics/trajectonomics; not published."
npm deprecate @trajectonomics/design-system-assets "Retired. Source is packages/brand in github.com/trajectonomics/trajectonomics; not published."
```

Run them as the owner, after (d). They are reversible: `npm deprecate <pkg> ""` clears the message.

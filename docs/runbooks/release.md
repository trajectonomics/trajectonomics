# Release runbook

One npm package ships from this repository: `@trajectonomics/cli` (`apps/cli`), the `traj` command.
Its tags are `cli-v*`, and it is listed in `tooling/release/packages.json`. The workflow is
`.github/workflows/release.yml`. `packages/core` (money, ledger, tax, sim) is **not published**: the
CLI bundles it into its binaries, so an engine change reaches users in the next cli release.

## How versions happen

- **Off until switched on.** `release.yml` does nothing while the repository variable
  `RELEASES_ENABLED` is not `true` (cutover step 2).
- **Alpha, on push to main.** When `apps/cli` or `packages/core` changed, the CLI gets
  `<next>-alpha.N` under the dist-tag `alpha`. Markdown-only changes publish nothing.
  `tooling/release/version.ts` computes the version.
- **Stable, by hand.** From main: publishes `<next>` under the dist-tag `latest`, creates the tag
  `cli-v<next>` and a GitHub release marked "latest", then builds and attaches the five binaries,
  `install.sh`, `install.ps1` and the checksums (`binaries.yml`).
- **Bump.** `auto` reads the conventional commits that touched `apps/cli` or `packages/core` since
  the last `cli-v` tag (`feat` is minor, a breaking change is major, anything else is a patch).
  Pass `patch`, `minor` or `major` to override it.

## Dispatch a stable release

```sh
gh workflow run release.yml --ref main -f package=cli -f bump=auto
```

`auto` fails with "Nothing to release" when nothing changed since the last tag.

## Repair a release's binaries

If npm accepted the version but `binaries.yml` failed, rebuild the assets from the tag. This
publishes nothing to npm:

```sh
gh workflow run binaries.yml --ref main -f tag=cli-v0.4.0
```

It refuses a tag that is not `cli-vX.Y.Z`, then smoke-tests and uploads the binaries.

## One-time cutover

Do these in order. Steps 1 and 4 need the owner's own logins; the rest can be run from a terminal
with `gh` signed in to the organisation.

**1. Point npm at this repository (owner, on npmjs.com).** Sign in, open
<https://www.npmjs.com/package/@trajectonomics/cli/access>, find **Trusted Publisher**, and replace the
`trajectonomics/cli` entry with: publisher **GitHub Actions**, organization `trajectonomics`,
repository `trajectonomics`, workflow filename `release.yml`, environment empty. Save. Until this is
done, every publish from here fails with an auth error, and nothing is published.

**2. Turn releases on.**
`gh variable set RELEASES_ENABLED --body true -R trajectonomics/trajectonomics`. From now on every
push to main that touches `apps/cli` or `packages/core` publishes an alpha. To turn it off again:
`--body false`.

**3. First stable release.**
`gh workflow run release.yml --ref main -f package=cli -f bump=auto`. Expect `0.4.0`: the engine's
imported history after `cli-v0.3.0` holds `feat` commits, and the output now names the engine as
`@trajectonomics/cli`. When it finishes, check that:
- `npm view @trajectonomics/cli dist-tags` shows `latest: 0.4.0`;
- the GitHub release `cli-v0.4.0` carries five binaries, `install.sh`, `install.ps1` and
  `checksums.txt`, and is marked "Latest";
- `curl -fsSL https://github.com/trajectonomics/trajectonomics/releases/latest/download/install.sh | sh`
  then `traj --version` prints `0.4.0`.

**4. Deploy the site and the docs from here (owner, in the Cloudflare dashboard).** Only after step
3, because both now link to this repository's releases. For each worker, open **Workers & Pages →
the worker → Settings → Build**, disconnect the old repository, connect
`trajectonomics/trajectonomics` on branch `main`, and set:

| Setting | `site` worker | `docs` worker |
| --- | --- | --- |
| Root directory | `apps/site` | `apps/docs` |
| Build command | `bun install --frozen-lockfile && bunx turbo run build --filter=@trajectonomics/site` | `bun install --frozen-lockfile && bunx turbo run build --filter=@trajectonomics/docs` |
| Deploy command | `bunx wrangler deploy` | `bunx wrangler deploy` |
| Build watch paths (include) | `apps/site/*`, `packages/brand/*`, `bun.lock` | `apps/docs/*`, `packages/brand/*`, `bun.lock` |
| Build variables | `BUN_VERSION=1.4.4`, `NODE_VERSION=22` | `BUN_VERSION=1.4.4`, `NODE_VERSION=22` |

Then **Retry build** (or push a commit) and open trajectonomics.com and trajectonomics.com/docs. The
worker names do not change, so `trajectonomics-web-router` keeps routing to them. Build with turbo,
not `bun run build`: turbo builds `packages/brand` first, whose `dist/current/` both apps import. A
white-label deploy is the same settings with one more variable, `BRAND=<folder in packages/brand/brands>`.
These commands were checked on a fresh shallow clone: install, build and `wrangler deploy --dry-run`
succeed for both apps.

**5. Forward the old install commands, then archive the old repositories.** Publish the forwarding
release in `trajectonomics/cli` as `tooling/release/forwarding/README.md` describes, so
`.../trajectonomics/cli/releases/latest/download/install.sh` installs from here. Then archive the old
repositories (`gh repo archive trajectonomics/<repo>`): site, docs, blog, cli, money, ledger-core,
tax-core, sim-core, design-system, skills, internal-skills and goals. Archived repositories stay
readable, and `gh repo unarchive` reverses it.

## Not done on purpose

The old npm packages `@trajectonomics/{money,ledger,tax,sim}` and
`@trajectonomics/design-system{,-theme,-svelte,-assets}` stay as they are: nothing replaces them on
npm. To mark them retired later:

```sh
npm deprecate @trajectonomics/<name> "No longer published. The code lives in github.com/trajectonomics/trajectonomics and ships inside the traj CLI."
```

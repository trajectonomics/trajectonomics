# Releasing the cli

The release process for every package, including `@trajectonomics/cli`, is in
[`docs/runbooks/release.md`](../../../../docs/runbooks/release.md). Read it first. Dispatch a
stable cli release from `main`:

```sh
gh workflow run release.yml --ref main -f package=cli -f bump=auto
```

The rest of this page is what is specific to the cli: the release docs check, the npm-first
window, what a green cli release looks like, and how to re-run one. The decisions behind the
binaries are in [ADR 0023](../adr/0023-release-artifacts.md).

## 0.6.0 only: the onboarding skill's privacy sentence ships with it

0.6.0 is the first release that counts anonymous usage ([ADR-0045](../adr/0045-traj-counts-its-own-use-and-one-command-turns-it-off.md)).
The published `traj-onboarding` skill says the ledger "sends nothing anywhere", which stops being the
whole truth on that release. Land [#165](https://github.com/trajectonomics/trajectonomics/issues/165)
right after the dispatch, in the same window as the marker-clearing pull request, and remove this
section in that pull request.

## Clear the release markers after the dispatch

The `> **Ships in X.Y.Z.**` line in `README.md` and every help note that names the version you just
cut come out **after** the dispatch, in the next pull request. The release-docs pull-request check
compares with the latest *published* release, so a pull request that removes a marker fails
`unreleased_command` until `npm dist-tags.latest` serves the new version; wait for it to, then land
the clearing pull request. The Monday freshness run reports any marker that still names an
already-released version.

The release that first ships marked work therefore carries its marker in its own help and in the
README of its tag. That is the accepted cost ([ADR-0034](../adr/0034-docs-and-help-name-the-release-that-ships-what-they-describe.md)):
the alternative is a pull request merged with a knowingly red check, or a check weakened by a
bypass label or a repository variable. A published version number is spent (ADR-0023), so the
clearing pull request is part of cutting a release, not a follow-up nobody owes.

## The npm-first window

npm publishes before the binaries exist. For a few minutes `npx @trajectonomics/cli@X.Y.Z`
prints one `retrying` line on stderr and the install script says the release is still being
built. That is expected, not a failure; both retry, and `releases/latest/download` only
404s during that window.

## What a green cli release means

- npm serves `@trajectonomics/cli@X.Y.Z`.
- The release `vX.Y.Z` carries eight assets: `traj-darwin-arm64`, `traj-darwin-x64`,
  `traj-linux-arm64`, `traj-linux-x64`, `traj-windows-x64.exe`, `install.sh`,
  `install.ps1` and `checksums.txt`.
- The artifact smoke ran each binary on its own OS and architecture *before* anything was
  attached, so a wrong asset never reached the release.
- The channel smoke installed through `npx` (and `bunx` on Linux) and ran the round trip,
  so the public URL, the launcher, the checksums and the cache all work together.
- `traj --version` prints the tag's version, not `0.0.0`, on every channel.

## Re-running

"Re-run failed jobs" is always the right move:

- The npm publish skips a version that is already on npm, and the tag and release are
  skipped when they already exist, so a re-run cannot publish twice.
- The `binaries` job rebuilds and clobbers every asset. It must: a Bun compile is not
  byte-reproducible, so each checksums file belongs to the build that produced it.

A re-run does not publish a new version, move the tag, or create a second release. It also
cannot replace a *wrong* binary under the same version: a published version number is
spent, so cut a patch instead.

Do not delete and re-create a release to repair it: `install.sh` resolves
`releases/latest/download`, so deleting the newest release moves that redirect backwards.
To repair missing or stale binaries, dispatch `binaries.yml` with `tag: vX.Y.Z` as the
[shared runbook describes](../../../../docs/runbooks/release.md#repair-a-cli-releases-binaries).

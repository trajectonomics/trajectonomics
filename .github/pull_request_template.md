## Description

<!-- A concise summary of what changes and why. -->

## Associated issue

<!-- Reference the issue this PR addresses, for example `Closes #12`. -->
Closes #

## PR title

- [ ] The PR title is a [Conventional Commit](https://www.conventionalcommits.org/), such as `feat: add a tax year`. It becomes the squash-merge subject, so it sets the version bump. The scope, when present, names a folder: `cli`, `core`, `tax`, `docs`, `site`, `brand`, `skills`.

## Domain and architecture

- [ ] Uses the terms in the package's `GLOSSARY.md`, with no synonyms introduced.
- [ ] Follows `CODING_STANDARDS.md`.
- [ ] Any architectural decision is recorded in the package's `docs/adr/`. ADRs are not edited to change history.

## Verification

- [ ] `bun run check` passes for the package this PR changes (`bunx turbo run check --filter=<package>`), or at the root for a change that crosses packages.
- [ ] New or changed tests cover the positive path and the invariant edge cases.
- [ ] For a release-affecting change, I know which release it ships in (see `docs/runbooks/release.md`).

---
status: accepted
---

# The Site prints the release from a committed Release snapshot

## Context

The hero pill, the footer's release line and the footer's `<time>` name the CLI's stable release, and the Answer engine file repeats the pill. Today those are literals in the two Dictionaries plus one constant beside the Site's other constants, and tests pin them, so nothing reads the release feed and every release leaves the Site behind until someone notices. It has happened twice: site#30 corrected `v0.1.0-alpha.1` to `v0.1.0`, and site#75 reports the home still naming `v0.1.0` as stable while npm's `latest` is `0.2.0` and the Docs Portal names `v0.2.0`.

The two parts also stopped sharing a version. The CLI's stable release is `v0.2.0` (2026-11-17) and the Onboarding skill's own marker is `v0.1.0` (2026-11-15), because the Prompt route installs the skill unversioned from `main` (skills ADR 0002 and 0003). One number cannot truthfully label both, and the owner settled the wording on 2026-11-18: the release line names the version, both part names and the date and makes no stability claim in words (`v0.2.0 — traj CLI + traj-onboarding`), and the footer's disclaimer carries no version, no "first" and no "stable".

## Decision

- **The release facts are a committed Release snapshot**, beside the Star snapshot: the CLI's bare semver, its release date as an ISO date, and the date the snapshot was read. `bun run release:update` writes it from npm's `dist-tags.latest` — what a visitor installs and what the Docs Portal follows — and from the GitHub release of that same tag, whose `published_at` supplies the date as its UTC calendar day. A `latest` whose tag has no published release yet is a release mid-publish (cli ADR-0023) and is never written, so the Site cannot announce a version whose binaries do not exist.
- **The derivation is a Pure Core.** A function takes the snapshot and returns one Language's `heroVersion`, `releaseLine`, `releaseDate` and the machine-readable date. It holds no `Date`, no `Intl` and no `fetch`; the month words and the Gregorian year are a table per Language, so a host's locale and ICU data cannot change a page (ADR 0004, `CODING_STANDARDS.md`). The Dictionary keeps its three keys and their documented meanings, so a new Language gets them by construction.
- **The release line is the same words in both Languages.** `v0.2.0 — traj CLI + traj-onboarding` is version, two part names and an em dash, and only the date is written in the Language. The owner's sentence stays; what the build supplies is the data in it.
- **Four built-file rules judge the build**, one Error Code each, over both Language homes, all three Not-found pages and the full Answer engine file: every `vX.Y.Z` on a covered page is the snapshot's version (`RELEASE_VERSION_UNKNOWN`), the footer prints the Dictionary's release line (`RELEASE_LINE_NOT_NAMED`), the footer's `<time>` text is the Dictionary's release date (`RELEASE_DATE_TEXT_NOT_NAMED`), and its `datetime` is the snapshot's ISO date (`RELEASE_DATE_MISMATCH`).
- **A stale snapshot is a weekly report, never a build step.** `bun run release:check` reads the two feeds and exits non-zero naming both versions; a `latest` whose release does not exist yet is reported as waiting, not as drift. A weekly workflow, with `workflow_dispatch`, runs it and opens or updates one issue titled `Release drift: …`, closing it when the snapshot is current. It opens no branch and merges nothing.
- **The visual baselines regenerate only in the documented environment** — `mcr.microsoft.com/playwright:v1.65.0-noble` plus `fonts-dejavu-core` (site#42) — and the Surface screenshots at 1280, 2000 and 390 px, light and dark, in both Languages are the evidence of the only intended change, the footer's words (factory ADR 0017).

## Considered Options

- **Fetch the feed in `prebuild`.** Rejected: `bun run check` would need the network, every agent's build would fail whenever npm lagged, and a release mid-publish would either break the build or ship a half-truth. cli ADR-0034 reaches the same split — the release is read by a script and a workflow, and the offline check stays offline.
- **Keep the literals and rely on review.** Rejected: this is what two releases already produced, and a test that pins the version fails at the next release in the wrong place, which trains its reader to update it blindly.
- **Name both parts' versions in the footer.** Rejected: the Prompt route installs the Onboarding skill unversioned from `main`, so its `metadata.version` is not something a visitor can pin or act on; printing it would be false precision and a second number to keep current.
- **Put the version in the Dictionary as owner copy.** Rejected: the owner writes the sentence, the feed writes the number. A version is data, and copying it into two Languages is how the Site carried it twice.
- **Open a pull request from the weekly check.** Rejected: a bot branch and a merge nobody reviews is a second way to change the Site; an issue is the shape the tooling-drift report already uses, and the next Factory pass picks it up.

## Consequences

- A release costs one command on the CLI's side of the world: `bun run release:update`, then the usual pull request. Nothing else in the Site knows a version.
- The Site prints no stability word any more, in either Language, and the version and date have one home on a page. The design record in `docs/design/landing-page-redesign.md` still quotes the v0.1.0 launch copy, which is history, and this record supersedes that line's wording.
- `bun run check` stays offline and deterministic, and the only network code is in `scripts/`. A test can show that `src/lib/` holds no clock, no `Intl` and no `fetch`.
- The weekly workflow can miss a release for up to seven days, and GitHub turns a schedule off after 60 days without repository activity; `gh workflow enable release-drift.yml` brings it back. A lag therefore stays possible, and it is reported rather than prevented.
- A page that names any other version now fails the build, so a hand-written literal, a stale component and a Dictionaries-only edit are all caught before merge.
- The skills repository's `v0.1.0` release note says "this tag is the release marker the Site names as stable"; with the Site naming `v0.2.0` and printing no stability word, that sentence belongs to the skills repository to correct.

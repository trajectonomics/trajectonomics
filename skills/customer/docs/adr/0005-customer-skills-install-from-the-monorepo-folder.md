# ADR 0005: Customer Skills install from the monorepo folder

**Status**: Accepted. Amends [ADR 0003](./0003-customer-skills-publish-from-this-repository.md) on the source name only. Superseded in part by [ADR 0007](./0007-customer-skills-install-globally.md): the source stays, the project scope does not.

## Context

Customers installed with `npx skills add trajectonomics/skills`. That repository was archived on
2026-11-21 during the monorepo cutover, so the command kept working but installed a frozen copy, and a
change to `skills/customer/skills/` never reached anyone (issue #16). Three ways to fix it were on the
table: point the command at this repository, publish a copy that CI refreshes (an npm package or a
generated repository or branch), or unarchive `trajectonomics/skills` as a mirror.

The first only works if the skills CLI can scope an install to `skills/customer` without also offering
the internal and vendored skills under `.agents/skills/`. It can, and this was tested against the live
repository with `skills@1.9.0`:

- `npx skills add trajectonomics/trajectonomics/skills/customer --list` finds exactly the five manifest
  Skills (`traj`, `traj-import`, `traj-onboarding`, `traj-plan`, `traj-review`) and nothing from
  `.agents/skills/`. The CLI's source grammar is `<owner>/<repo>/<subpath>`, and the subpath bounds the
  search.
- `--skill traj-onboarding` installs one Skill, and the lock records `source`
  `trajectonomics/trajectonomics`, the commit, and `skillPath`
  `skills/customer/skills/traj-onboarding/SKILL.md`.
- A pin is a fragment: `trajectonomics/trajectonomics/skills/customer#<40-character commit>` installs
  at that commit and records it as `ref` and `commit`. The `<repo>@<commit>` form ADR 0003 used does
  not take a subpath.

## Decision

1. Every install command names the source `trajectonomics/trajectonomics/skills/customer`: the website
   prompt's raw URL, the README, both Skills, the CLI README, the docs portal and the check script.
2. A pinned install, which `traj-onboarding` uses for the rest of the set, is that source with
   `#<commit>`. The manifest is read from `skills/customer/skills.manifest.json` at the same commit.
3. A merge to `main` is the release. There is no copy, mirror, package or workflow to keep in sync, and
   `trajectonomics/skills` stays archived.

## Consequences

- The "changes reach customers without a manual copy" requirement holds by construction: the installed
  files are the files in this folder at the commit.
- The skills CLI hides a Skill whose name is in the root `skills-lock.json`, and that lock sits in the
  repository the subpath search runs in. It pins external skills only, and a customer Skill must stay
  out of it (see `AGENTS.md`).
- `scripts/check-skills-install.sh` takes `trajectonomics/trajectonomics@<commit>` and proves the
  folder: it lists exactly the manifest set, installs every row from that commit, and expects the lock
  to record `trajectonomics/trajectonomics`. Customers who installed from the archived repository keep
  a lock that names `trajectonomics/skills`; re-running the new command moves them.
- A customer who clones this repository and installs from its root would be offered every skill under
  it. The documented command always carries the folder.
- Rejected: a published npm package or generated branch (a second copy and a release job to maintain,
  and a secret for the npm route), and unarchiving the old repository as a mirror (a token that can push
  to it, and two names for one thing).

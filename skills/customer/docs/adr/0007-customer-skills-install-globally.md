# ADR 0007: Customer Skills install globally

**Status**: Accepted. Supersedes the install scope of [ADR 0005](./0005-customer-skills-install-from-the-monorepo-folder.md), which keeps its source decision.

## Context

Every documented install command ran in the folder it was typed in, so the skills CLI wrote
`./.agents/skills/` and `./skills-lock.json`. `traj-onboarding` then closed with a promise that a new
session loads the operating skill by itself, which was false in another folder: setup had made the
skill available to one project, not to the person (#139). Setup also followed the scope it found, so
a project-scoped copy kept every later folder blind.

The skills CLI can install for the user instead, with `-g`. It writes the skills under the user's
agents directory and a global lock. `npx -y skills@1.9.0 list -g --json` scans the global skill
folders and annotates each skill with its `source` from that lock.

## Decision

1. Every person-facing install command carries `-g`: both READMEs, the CLI README, the Installation
   page, and the command `traj-onboarding` names.
2. `traj-onboarding` installs the whole set with `-g`, and reads the pin from the global lock only:
   `${XDG_STATE_HOME}/skills/.skill-lock.json` when `XDG_STATE_HOME` is set, and
   `~/.agents/.skill-lock.json` when it is not. When the global lock has no entry for
   `traj-onboarding` — a project-scoped copy, or a person who pasted the raw `SKILL.md` URL — it
   first installs `traj-onboarding` globally with
   `npx -y skills@1.9.0 add trajectonomics/trajectonomics/skills/customer --skill traj-onboarding -g -y`,
   then reads the pin from that lock.
3. A project-scoped copy is never deleted. The person is told in one sentence that
   `npx -y skills@1.9.0 remove <name>` in that project removes it if they want only the global one.
4. The setup check and the Done line read the global list, so "a new session loads that skill by
   itself" is true in every folder.

## Consequences

- Setup leaves the folder it ran in as it was: no `skills-lock.json` and no `.agents/skills/` appears
  there for the customer set.
- A person who installed before this ADR keeps a project-scoped copy that still works in that one
  project. The next setup installs the set globally beside it, and the global copy is what every
  other folder sees.
- In the folder where that older copy lives, the operating skill still prefers the project `traj`.
  When that entry has no pin, the operating skill tells the person to remove the project copy before
  re-running setup, since setup no longer repairs a project entry.
- The internal skills keep their project scope: `skills/internal` is for a session working in this
  repository, not for a person.

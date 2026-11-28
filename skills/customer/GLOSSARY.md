# Domain Glossary: @trajectonomics/skills

Ubiquitous language for `skills/customer` (`@trajectonomics/skills`). Every term defined here is binding across code, tests, documentation, and PR titles. Synonyms in a diff are defects.

## Core Terms

### Skill
A packaged set of agent instructions, defined by a `SKILL.md`, that an agent loads for a particular kind of task.

### Skill Pin
An entry in a skills lock (the project `skills-lock.json`, or the global `.skill-lock.json` the customer skills install into) recording a skill's source, commit and content hash so installs are reproducible.

### Skill Manifest
`skills.manifest.json` at the repository root: the allowlist of the Customer Skills this repository publishes, one row per Skill naming its directory and the CLI Range it expects, in install order. It is the one authored place a range lives — each Skill's frontmatter copy is written from it and checked, and a directory under `skills/` with no row, or a row with no directory, fails `bun run check`.
_Avoid_: skill list, catalogue file

### Recipe
The ordered steps of a multi-step job a workflow Skill carries: what to read first, what to prove, what to stop on. A Recipe names no flag, unit or label that `traj schema` does not publish; the policy is the Skill's, the command surface is the tool's.
_Avoid_: workflow, procedure

### Invariant
A rule or condition that must hold true across all state transitions in this system.

### CLI Range
The npm semver range a published Skill declares it expects of `@trajectonomics/cli`, from the Skill Manifest: copied into the Skill's frontmatter, and stated in the Skill's body only as its CLI Version Floor, because it is authored once and every other place derives from it. Its lower bound is the CLI Version Floor; its upper bound says when a new CLI minor needs the Skill rechecked, and is not a compatibility claim. The lower bound gates an install: a Skill is installed when the command line is at or above its floor, and skipped and named below it. Above its upper bound it is still installed, disclosed instead ([ADR 0004](./docs/adr/0004-the-cli-range-ceiling-is-a-recheck-marker.md)). Every published Skill declares `>=0.2.0 <0.9.0` today, except the planning Recipe `traj-plan`, which declares `>=0.3.0 <0.9.0` because its Thai tax allowance flags are published from 0.3.0.
_Avoid_: supported versions, min version

### CLI Version Floor
The oldest `@trajectonomics/cli` release whose command surface a published Skill assumes: the lower bound of that Skill's CLI Range in the [Skill Manifest](#skill-manifest), which is where the number is authored. The onboarding Skill states the floor of the Skill it hands over to and discloses a command line older than it, instead of handing the conversation over silently.

### Sign Convention
How a printed figure's sign reads, by account type: raw signed units where a liability, income and equity row is negative when normal, so a debt of 2,400.00 prints `-2400.00` and net worth is the printed sum that already counts it. The operating Skill's "Read a sign" section states it once and every other Skill reads from there. `tx add --opening` is the one signed write, and a negative amount opens a debt at every release in the CLI Range.
_Avoid_: sign rules, debt rule

### Ledger File
The SQLite file at `${TRAJ_HOME:-~/.traj}/traj.db`, whose presence means the ledger has been opened on this machine at least once, and never that it holds data: `traj init` and every store-opening command create it empty on the way. The onboarding Skill tests for it and hands the read to the operating Skill.
_Avoid_: database, data directory

### Tax Baseline
The Scenario a `traj-plan` tax comparison starts from: a fork whose tax Levy the Skill wrote in this conversation, with the person's stated facts. Both sides of a comparison are Levies written by the installed `traj`, so one rule set taxes both; a Levy stored by an earlier session is never a side, because `traj schema` cannot say which release wrote it ([ADR 0006](./docs/adr/0006-a-tax-comparison-uses-levies-written-in-the-conversation.md)).
_Avoid_: base plan, stored baseline

### Traji
The mascot the customer Skills speak as — warm and upbeat, and quiet when the news is bad — named by
the owner on 2026-11-28. Each Skill carries the same voice section, and its poses ship inside the
Skill folder as transparent WebPs, copied byte for byte from the Site, and are shown only at the
moments that matter, never on every reply, and never fetched from the web
([ADR 0008](./docs/adr/0008-the-skills-speak-as-traji.md)).
_Avoid_: mascot persona, robot avatar

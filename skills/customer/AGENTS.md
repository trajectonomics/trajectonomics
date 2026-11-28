# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `skills/customer` (`@trajectonomics/skills`), the first-party customer skills.

## Rules

1. Keep core packages pure and deterministic wherever applicable, as the root rules say; the skill scripts follow the same closed-world, explicit-contract style.
2. Done means `bun run check` passes in `skills/customer`: Biome lint with zero warnings, strict typecheck, tests, build, publint and are-the-types-wrong. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.

## First-party customer skills

The set this package publishes is declared in `skills.manifest.json` in this folder: one row per Skill, naming its directory and the CLI Range it expects, in install order. Today `traj-onboarding` sets a person up on `traj`, `traj` operates the command line afterwards, and `traj-import`, `traj-review` and `traj-plan` carry the bank-import, check-in and planning Recipes; another Skill is one row and one checked set. Every row publishes from this repository and is installed from it, never from `internal-skills` ([ADR 0003](./docs/adr/0003-customer-skills-publish-from-this-repository.md)). The one install source is the folder `trajectonomics/trajectonomics/skills/customer`, which the skills CLI scopes to this package's `skills/` and so never offers the internal or vendored skills under `.agents/skills/`; a merge to `main` is the release, with no copy or mirror ([ADR 0005](./docs/adr/0005-customer-skills-install-from-the-monorepo-folder.md)). Every person-facing install carries `-g`, because a person installs for their user and every new agent session in every folder must find the set ([ADR 0007](./docs/adr/0007-customer-skills-install-globally.md)).

A Skill under `skills/customer/skills/` is first-party and hand-edited, and its row in `skills.manifest.json` is what publishes it. Do not add it to `skills-lock.json` (the root lock, which pins external skills only) and do not copy it into `.agents/skills/`. The skills CLI hides a Skill whose name is already in that lock, so a lock entry there makes `npx skills add trajectonomics/trajectonomics/skills/customer --skill <name> -g` unable to install it. Do not run that install command inside this repository.

## The trigger surface

A Skill's frontmatter `description` is the only thing a customer's agent reads when it decides whether to load the Skill, so each one names the job its Skill does and no neighbouring job. [`evals/trigger-queries.json`](./evals/trigger-queries.json) holds the Factory's twenty fixed queries and their verdicts, derived from `qa-trigger-queries.md` and never re-authored here, plus two Thai income tax estimate queries marked `extra` that pin the estimate to `traj-plan`. `scripts/trigger-descriptions.test.ts` pins the boundary offline (no description claims a must-stay-silent job); whether an agent actually fires is measured with a model, so it is not part of `bun run check`. After editing any description, measure it from this folder, one call at a time:

```bash
bun scripts/measure-triggers.ts            # three runs per query on claude-haiku-5-5, about three minutes
bun scripts/measure-triggers.ts --runs 1 --model <id>
```

It lists exactly the five names and descriptions and asks which Skill to load. Haiku is a proxy for the customer's agent, and the QA pass uses DeepSeek through `pi`, so a rise here is evidence and the QA pass is the verdict. The removal query is recorded as unclaimed until `traj-maintain` ships.

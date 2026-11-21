# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `skills/customer` (`@trajectonomics/skills`), the first-party customer skills.

## Rules

1. Keep core packages pure and deterministic wherever applicable, as the root rules say; the skill scripts follow the same closed-world, explicit-contract style.
2. Done means `bun run check` passes in `skills/customer`: Biome lint with zero warnings, strict typecheck, tests, build, publint and are-the-types-wrong. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.

## First-party customer skills

The set this package publishes is declared in `skills.manifest.json` in this folder: one row per Skill, naming its directory and the CLI Range it expects, in install order. Today `traj-onboarding` sets a person up on `traj`, `traj` operates the command line afterwards, and `traj-import`, `traj-review` and `traj-plan` carry the bank-import, check-in and planning Recipes; another Skill is one row and one checked set. Every row publishes from this repository and is installed from it, never from `internal-skills` ([ADR 0003](./docs/adr/0003-customer-skills-publish-from-this-repository.md)).

A Skill under `skills/customer/skills/` is first-party and hand-edited, and its row in `skills.manifest.json` is what publishes it. Do not add it to `skills-lock.json` (the root lock, which pins external skills only) and do not copy it into `.agents/skills/`. The skills CLI hides a Skill whose name is already in that lock, so a lock entry there makes `npx skills add trajectonomics/skills --skill <name>` unable to install it. Do not run that install command inside this repository.

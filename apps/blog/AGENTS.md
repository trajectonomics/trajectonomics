# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/blog`, which was started from the Trajectonomics repository template.

## Rules

1. Done means `bun run check` passes in `apps/blog`. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.

## Checklist When Instantiating a New Repo

When creating a new repository from this template:
1. Run `/setup-the-repo` (or `bun run setup`) to interactively configure your package coordinates, description, archetype, domain glossary, and architecture records.
2. Next, run `/setup-matt-pocock-skills` to wire up your issue tracker and triage labels.
3. Run `bun run check` to verify linting, types, build, and tests.

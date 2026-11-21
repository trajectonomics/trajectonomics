# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This folder is the source of the internal skills (`trajectonomics/internal-skills`, now part of this monorepo).

## Rules

- Edit an internal skill here, in `skills/internal/skills/<name>/`. The root `.agents/skills/<name>` entry is a symlink to it, so there is no copy to keep in step.
- Internal skills are not in `skills-lock.json`: they are not pinned from an outside source.

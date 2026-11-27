# Agent skills

Where the installed skills come from, how they are linked, and the commands that manage them. [`AGENTS.md`](../../AGENTS.md) points here.

## Where the skills come from

| Source | Lives in | Pinned | Used by |
|---|---|---|---|
| [`mattpocock/skills`](https://github.com/mattpocock/skills) (external) | `.agents/skills/<name>/` (real copy) | `skills-lock.json` | every agent |
| `RefoundAI/lenny-skills` (external, `goal-setting-okrs`) | `.agents/skills/goal-setting-okrs/` (real copy) | `skills-lock.json` | every agent |
| `aref-vc/tufte-claude-skill` (external, `tufte`) and `ibelick/ui-skills` (external, `fixing-accessibility`) | `.agents/skills/<name>/` (real copy) | `skills-lock.json` | every agent; [`DESIGN_PRINCIPLES.md`](../../DESIGN_PRINCIPLES.md) says where they yield to this repository's rules |
| `trajectonomics/internal-skills` (internal) | `skills/internal/skills/<name>/`, linked from `.agents/skills/<name>` | not in the lock | every agent |
| First-party customer skills | `skills/customer/skills/<name>/` | `skills.manifest.json` | the product; never installed here |

- The canonical copy of every installed skill is `.agents/skills/` at the root. `.claude/skills/<name>` (Claude Code) and `.vibe/skills/<name>` (Mistral Vibe) are relative symlinks to `../../.agents/skills/<name>`, and `.grok/skills/goal-setting-okrs` is one more. Never edit the external copies or the symlinks by hand.
- Edit an internal skill in `skills/internal/skills/<name>/`, the source of truth. Its `.agents/skills/` entry is a symlink, so the change is picked up everywhere.
- A first-party customer skill is hand-edited in `skills/customer/skills/`. It is never in `skills-lock.json` and never copied into `.agents/skills/`: a lock entry would stop `npx skills add trajectonomics/trajectonomics/skills/customer --skill <name>` from installing it.
- Add a new skill: external skills through the Vercel `skills` CLI (below), which updates the lock, then list the copy in [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) (a new upstream also needs its own section with its licence), or `bun run check` fails; internal skills by adding the folder under `skills/internal/skills/` and the three symlinks.

## Commands

- Check: `bun run skills:check` (`bunx skills@latest check`)
- Update: `bun run skills:update` (`bunx skills@latest update`)
- Reinstall the external set: `npx skills add mattpocock/skills --skill '*' -a claude-code codex opencode antigravity-cli pi -y`
- Restore from the lock: `npx skills experimental_install`, then recreate the Claude Code and Vibe symlinks.

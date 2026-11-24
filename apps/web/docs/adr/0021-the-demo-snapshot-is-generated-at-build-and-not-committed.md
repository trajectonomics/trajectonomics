---
status: accepted
---

# The Demo snapshot is generated at build and is not committed

The Demo snapshot (`public/demo/snapshot.json`) was a committed file that `bun run demo` rewrote and Biome then formatted. It was about a megabyte of tab-indented JSON, and two things went wrong with that ([#378](https://github.com/trajectonomics/trajectonomics/issues/378)):

- **It conflicted.** Any change that moves a figure in the Demo regenerates the whole file, so two such pull requests always conflict on it. 25 commits changed it on `main` in three days.
- **Biome's size limit.** A file over Biome's default 1 MiB limit is skipped with a warning, and `biome ci --error-on-warnings` turns that into a failure. The committed file sat just under the limit, and raising the limit (`files.maxSize`) would have touched the shared config that [root rule 5](../../../../AGENTS.md) forbids loosening.

The owner decided on 2026-11-24 that the file is generated and never committed.

## Decision

- **The file is not in git.** `public/demo/snapshot.json` is in `.gitignore`. Biome reads the ignore file (`vcs.useIgnoreFile`), so it never sees the file, with no change to `biome.json`.
- **`bun run demo` writes it, and Turborepo runs that first.** `apps/web/turbo.json` has a `demo` task whose output is `public/demo/snapshot.json`, and `build`, `test` and `check` depend on it. A second run with nothing changed is a cache hit and restores the file.
- **The generator writes compact JSON.** It no longer calls Biome, so there is no formatter step and nothing to keep in step with the formatter's settings. Two runs give the same bytes: the Demo's dates, seed and ledger are fixed.
- **A missing file says how to make it.** The tests and scripts that read the snapshot go through `scripts/demo-snapshot.ts`, whose error is `Run turbo run demo, or bun run demo in apps/web`, not a bare `ENOENT`. A fresh clone runs `turbo run demo` (or `check`) before `bun test`.
- **`demo` builds its own `traj`, and does not depend on `@trajectonomics/cli#build`.** The CLI embeds the Pack ([ADR 0007](0007-traj-dashboard-serves-the-dashboard-on-loopback.md)), the Pack holds the Demo snapshot, and so `web#build → demo → cli#build → web#build` would be a cycle that Turborepo refuses. The Demo's figures do not come from the embedded pages, so `scripts/demo.ts` compiles the CLI's own source into a scratch directory without a Pack (`traj dashboard` then reports it has no pages, which the Demo never runs). The task declares the CLI's source and its `@trajectonomics/core` build as inputs, so a change to what `traj` states regenerates the file.

## Considered Options

- **Keep committing it and raise Biome's size limit (`files.maxSize`).** Rejected: it keeps the merge conflicts, and it loosens the shared config.
- **Keep committing it and exclude it from Biome in `biome.json`.** Rejected for the same conflicts, and the file would still be a megabyte of generated text in every diff.
- **Commit a smaller Demo.** Rejected: the Demo shows every page with a real figure, and a thinner ledger would show less.
- **Generate it with the workspace `traj` (`@trajectonomics/cli#build`).** Rejected for the cycle above.

## Consequences

- A fresh clone has no Demo snapshot until `turbo run demo` (or `check`, `build`, `test`) has run. `bun test` alone fails with the message above.
- Generating the Demo costs one planner run in each job that needs it. The CI issue ([#464](https://github.com/trajectonomics/trajectonomics/issues/464)) covers running it once per workflow run and sharing the file.
- The hosted Demo ([ADR 0009](0009-the-demo-dashboard-is-hosted-on-the-site.md)) reads the file the build wrote, so it is always the Demo of the code that was built.

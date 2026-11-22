# A development build refuses the default data directory unless `TRAJ_HOME` is set

A development build of `traj` from `main` once ran without `TRAJ_HOME`, opened the owner's real ledger in `~/.traj` and migrated it from schema 2 to 3, past what the installed release reads (cli#303). ADR-0050's pre-migration copy made the restore lossless, but the ledger had still been changed by software nobody had released. ADR-0014 makes an empty or unset `TRAJ_HOME` fall back to `~/.traj`, so the fall-back is the hazard, and it is the same for an agent and a person building from source.

**A build that is not a published release refuses to open the default data directory.** A build is a development build when its version is `0.0.0` (`DEVELOPMENT_VERSION`, the version the repository's package carries and the release workflow replaces before compiling, ADR-0023; ADR-0045 already uses it to keep a development build out of the usage count). `bun src/index.ts`, `bun run dev`, a local `bun build` of an unreleased tree and every `bun test` run are development builds. When `TRAJ_HOME` is unset or empty, such a build fails with `default_home_refused` (exit class 3, a refusal) before it looks at a path. The message names the directory it would have opened, and the hint says to set `TRAJ_HOME` to a scratch directory and names the override.

**`TRAJ_ALLOW_DEFAULT_HOME=1` lifts the refusal.** It is for the maintainer's own deliberate use of a development build on their real ledger. Only the value `1` counts, so `0`, `true` or an empty string cannot lift it by accident. A set `TRAJ_HOME` never needs it.

**A published release behaves as before.** The guard reads the version and nothing else, so a release build, whatever its `TRAJ_HOME`, is never refused. The unit test passes a release version to the guard, because every test process is itself a development build.

**Only commands that open the data directory are guarded.** The guard sits where the directory is resolved for use: `openStore` (every command that reads or writes the ledger, `backup`, `export`, `inspect` included), `createLedger` (`init`, `restore`), `doctor` and `data remove`. `version`, `help`, `schema` and `telemetry` never resolve it and are unaffected; the usage-count state lives in the config directory (ADR-0045), not the data directory.

## Considered options

A build-time define (`--define RELEASE=1`) as the release marker, rejected because the version is already stamped on every release and tested against the tag (ADR-0023), so a second marker could disagree with it. Refusing in `dataDirectory()` itself, rejected because it returns a string and the callers that only compute a path (the launcher's `bin/` cache is outside this binary) would have to handle an error they cannot cause. Warning on stderr and carrying on, rejected: the damage is the migration, and a warning is read after it.

## Consequences

A test must always pass `TRAJ_HOME`; one that leaves it unset gets `default_home_refused` instead of silently touching the developer's ledger. `default_home_refused` is in `LEDGER_OPEN_CODES` and in the `errorCodes` of `init`, `restore`, `doctor` and `data remove`, the commands whose subject is the data directory.

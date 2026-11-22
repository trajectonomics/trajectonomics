# `traj` counts its own use, on by default, and one command turns it off

G1 in `org/goals/GOALS.md` counts people who run `traj` every week, and nothing measures that today. The Site and the Docs Portal already post page views to the same PostHog project from their own code. On 2026-11-22 the owner asked for product analytics from the CLI with an easy opt-out, so the question of who runs the command, and how often, has an answer.

Each run that finishes sends one anonymous event, `traj_command_run`, with the command name, the exit code, the error code when there is one, the output format, the version, the OS and the architecture. It never sends the ledger, an argument, a flag value, a file path, an account name, an amount, the data directory or an environment variable (`src/telemetry/event.ts`, whose test pins the exact set of property keys). Events carry a random UUID created on first send, stored in a state file that `traj telemetry off` deletes. A machine that cannot save that id (a read-only home in an agent's sandbox, for example) sends nothing: an id that is not kept would be a new person on every run and inflate the weekly count, and the notice would repeat each time.

The state file lives in the config directory (`$XDG_CONFIG_HOME/traj`, or `~/.config/traj`; `%APPDATA%\traj` on Windows), not in the data directory. `traj data remove` deletes `~/.traj`, and an opt-out must survive that. ADR-0039 keeps the data directory for `init` alone, so the state file cannot live there either.

Whether a run counts is decided by one pure function, which checks the causes in this order and reports the first that applies: `DO_NOT_TRACK` set to anything but empty, `0` or `false`; `TRAJ_TELEMETRY` set to `0`, `off` or `false` in any case; `CI` set to anything but empty, `0` or `false`; the state file saying off; a development build (version `0.0.0`). A development build, every `bun test` run and `bun run dev` therefore never send. `traj telemetry status` reports the decision and its reason, so the cause that stops counting is visible in a result and not only in the environment.

The command group is `traj telemetry status`, `off` and `on`. Each prints the same three facts: whether counting is on, the reason, and the state file. `off` writes the choice and removes the id, so a later `on` starts a new id that nothing links to the old one. `on` does not override `DO_NOT_TRACK`, `TRAJ_TELEMETRY`, `CI` or a development build; its result says which of those still stops it.

The event is sent by a detached copy of the same binary. After `run()` returns, `afterRun` spawns `selfCommand()` with the event body in `TRAJ_TELEMETRY_EVENT`, with its stdio ignored and the child unreferenced, and the parent exits at once. A child started with that variable posts the body to the EU endpoint and exits without running a command. A body that is not a `traj_command_run` event is dropped. The alternative, awaiting the request, costs several hundred milliseconds per command on a distant connection, and an agent runs dozens of commands in a session.

The first successful run that counts prints one line on stderr, and it prints it only once, as recorded in the state file. Stderr is allowed here because the notice is never written beside a JSON error envelope: it appears only when the exit code is 0, which ADR-0010 and ADR-0013 keep silent on stderr for an error. The same facts are published as the result of `traj telemetry status`, so nothing is only on stderr. A state file that saved the id but not the notice flag repeats the notice on the next run, which is the honest outcome of a machine that cannot remember it.

`run()` only reports what ran (`observe`, once per invocation, with the command the tree landed on and the error code). The telemetry logic lives in `src/telemetry/` and `src/index.ts` calls it, so the command layer stays as it was (ADR-0010 and ADR-0040).

## Considered options

- **Opt-in, default off.** Rejected: the owner chose opt-out, and an opt-in signal would be too small to count the people G1 needs.
- **Awaiting the POST before exit.** Rejected for the latency reason above.
- **A spool file sent on the next run.** Rejected: it leaves a file of usage records on disk that nothing reads back, and the next run may never come.
- **Storing the id in `~/.traj`.** Rejected: `traj data remove` would delete the id together with the ledger, and a removal would quietly reset the count.
- **`posthog-node`.** Rejected: it is a dependency for one HTTP POST, and the Site and the Docs Portal already post without it.

## Consequences

- The count of people who run `traj` each week is the number of distinct `distinct_id`s that sent `traj_command_run` in the week, less the owner's own machines. Those ids are random and do not identify a person.
- PostHog sees the IP address of each request, as it does for any web request. The README says so.
- The published customer skill `traj-onboarding` says "the ledger makes no network connection" (`skills/customer/skills/traj-onboarding/SKILL.md`). That becomes untrue on the release that ships this change, so the skill text must change in the same release. That is a follow-up, not part of this change.
- The test binary is a development build, so the tests exercise the send path only through injected transports (`src/telemetry/send.test.ts`), and `src/help-examples.test.ts` runs the telemetry examples in a temporary config home so they never write a real one.
- Any future field in `properties` needs a change to the exact-key test, which is the point of it.

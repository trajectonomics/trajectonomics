---
status: accepted
---

# The Docs Portal follows the release through a committed snapshot

The Operator tab documents one `traj` release: the one `src/generated/cli-release.json` records. The snapshot holds that release's leaves and flags (`traj schema <leaf> --json`), its global flags, the root help's commands, exit codes and environment variables, and the error registry with each code's `retryable`. `bun run snapshot:cli` writes it from npm's `latest`, or from `--version X.Y.Z`, and nothing else moves it.

Three checks hold the pages to it:

- **In `bun test`, offline, so in the deploy gate.** `src/lib/release-facts.ts` fails a page whose command table, exit codes, retryable codes, environment sections or named error codes disagree with the snapshot. The command-reference rules of [ADR 0011](./0011-command-reference-drift-is-checked-by-a-workflow.md) (a leaf with no section, an unknown leaf, a missing or unknown flag) now run there against the snapshot too, instead of against npm in a workflow.
- **Executed examples, in the `Docs examples` workflow.** A fence whose info string is `bash exec` runs against the snapshot's release, installed by its own install script. The Quickstart's examples run first, and every other page starts from the ledger they leave. An `output` fence right after one (`text output`, `json output`) must equal its stdout, with ids and timestamps masked. `bun test` fails a fence label one or two edits from `exec` or `output`, and an `output` fence no `exec` fence claims, so a typo cannot skip an example, and the run fails when the Quickstart has none. The job needs the network, so it never runs in `bun run check`.
- **Freshness, in the `Docs release` workflow.** When a dispatched (stable) Release run finishes, and weekly, it compares the snapshot with npm's `latest`. While `latest` is ahead it keeps one issue open, `Docs behind the latest traj release`, listing the commits and design records between the two tags and the steps: snapshot, check, fix, then read what changed.

On 2026-11-21 the pages still said they documented `v0.2.0` while `0.4.0` was out, the Landing Page said 0.4.0, and five behaviours from 0.3.0 appeared on no page. The `Command reference` job had stayed green, because it checked only leaves and flags, and a page's prose and examples had no check at all.

## Considered options

- **Update the docs in the CLI pull request that changes the behaviour.** A merge to `main` deploys the docs at once, but the CLI ships only when someone dispatches a release. A page updated in the CLI pull request would describe a command that no installed `traj` has. The release is the moment the pages may change, so the issue opens then.
- **Generate the pages from the snapshot.** [ADR 0002](./0002-authored-content-with-proposal-only-sync.md) keeps pages authored, and the Markdown twin serves the authored source, which would expose a component tag instead of the text. The checks state the facts the pages must keep; authors keep the words.
- **Run examples against the workspace CLI.** That tests `main`, not the release a reader installs, for the same reason as the first option.
- **Keep comparing against npm in a pull-request workflow.** A release that lands during a pull request turns unrelated work red, which is why ADR 0011 had to diff against the merge base. A committed snapshot moves only in the pull request that moves it.

## Consequences

- A release turns nothing red by itself. It opens the issue, and the pull request that runs `snapshot:cli` fails `bun run check` until every page it contradicts is fixed.
- A page that shows a command's output should show it as `bash exec` plus an `output` fence, so the output is checked. A failure example cannot be one, because an example must exit 0.
- Prose about behaviour, such as what a hint says or why a refusal happens, stays unchecked. The issue's commit and ADR list is where an author finds it.

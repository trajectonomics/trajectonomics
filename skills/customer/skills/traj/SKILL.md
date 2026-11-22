---
name: traj
description: "Operate `traj`, the Trajectonomics ledger and projection CLI, on someone's own money: record what they earned and spent, read balances and reports, and answer what-if and financial-independence questions. Use when the user talks about their accounts, spending, budget, net worth, savings plan, Thai tax, or planning a purchase."
metadata:
  cli: ">=0.2.0 <0.3.0"
---

# traj

`traj` is a deterministic ledger and projection CLI. It computes exactly and **never calls an LLM**, so every number you give the user is one `traj` produced. You supply the judgement; `traj` supplies the arithmetic.

Its command surface changes as features land, so this document deliberately carries none: it is the contract every job shares, not a recipe for one. Read the tool.

## Run the CLI

Run `traj --version`. A version that prints is a `traj` you can trust and reuse for the whole session: the release tag, the npm package and the binary's stdout are one version by construction.

If that fails, run the scoped npm package, which needs only Node 20 or later, or Bun:

```
npx -y @trajectonomics/cli@latest <args>
bunx @trajectonomics/cli@latest <args>
```

Either way, get the version once and pin it: the number from `traj --version`, or from `npx -y @trajectonomics/cli@latest --version` when you are on the fallback. Put that number into the npm spec as `@<version>` and use it for every later call, so one session cannot end up running two releases. The first npm run downloads about 100 MB of binary and narrates that download on stderr; a line about downloading is not an error.

The npm package is `@trajectonomics/cli`; the unscoped package of the same short name belongs to someone else.

`npx -y` runs code neither of you reviewed, so say why it is the safe choice here: the launcher verifies the published SHA-256 of the release binary. Nothing about it sends the user's data anywhere — and you send nothing either, never uploading or pasting their ledger, documents or exports.

When the user wants `traj` kept on `PATH`, give them the one-line install command for their platform from the CLI's README and let them run it. Handing them a remote script to pipe into a shell is their decision, not yours.

## Where the data lives

All state is one directory, `~/.traj` on every platform, holding `traj.db` and a cache of downloaded binaries. `TRAJ_HOME` overrides it, which is how you isolate a scratch run. On a machine that has never run it, run `traj init` first and pass `--json` like every other call.

## Read the tool before you act

1. `traj schema --json` lists every command with a one-line summary, plus the error registry: each `code` with its `exitCode` class and message.
2. `traj schema <command> --json` gives that command's flags, its input and output JSON Schema, the document schema it accepts when it has one, and the error codes it can raise. Do this before the first use of a command, every session.
3. `traj help <command>` adds worked examples.
4. A command that takes a document may print a template: `traj scenario apply --template` prints a Scenario, `traj tx import --template` prints the CSV header, and where the schema stops at its `schemaVersion`, the template is where the fields are.

Take every flag, required field, document shape and enum value from that output, not from memory and not from this document. **Never invent a command, a flag, a field or an enum value.** When the tool does not publish it, say so instead of guessing: a guess that happens to run is worse than a refusal, because the next one will not. A page about `traj` is depth, never the arbiter: when it and the release disagree, the release wins.

## The contract

- Pass `--json` on every call, or set `TRAJ_FORMAT=json`. The format is never inferred from a terminal, so tell the CLI and its pipe and terminal cannot disagree by accident.
- Commands never prompt. Nothing will come back asking a question.
- A JSON error is an envelope on stderr: `{"error":{"code","exitCode","message","path?","hint?","details?"}}`. Read `exitCode` for the class, `code` for which failure, `hint` for what to try next.
- Exit classes: `0` ok, `1` unexpected, `2` invalid input you must fix, `3` the domain refused it, `4` not found, `5` conflict such as a name already taken. A launcher failure, before the binary starts, is plain text rather than an envelope: read it, tell the user what it said, and stop retrying.
- Money is a decimal string at the currency's scale, with its currency (`"120.50"`), everywhere except inside a Scenario document: an amount you pass in a flag, a CSV `amount` cell, a transaction document, and every amount a ledger, report or projection result prints. Inside a Scenario document — one you apply or read back, and the `--set` overrides that change it — money is an integer of minor units, so `100000` is 1,000.00 THB, which is that document's form of the same amount and not a restatement. `traj schema` is the authority wherever it states a unit. Keep the unit the user's: restating one amount in a different unit is a second number you invented.
- Dates are `YYYY-MM-DD` Gregorian, in English. A Buddhist Era year is the same day under a different year number: convert it, and ask the user when the source does not say which calendar it is.
- Use `traj`; never import a core package and compute the figure yourself. The point of the tool is that its arithmetic is the one answer.

## Keep every fact explicit

`traj` has no clock and no opinions, so everything it should know, you state:

- Every date, including every as-of date, is an argument you supply. "Today" is a date you were given or one you ask for; it is never read off the machine.
- Every account is a name, exact and case-sensitive. Read the chart of accounts before you write to one; an account the user has not created is a question, not a guess.
- Every amount, date and account comes from what the user told you. When a fact is missing, or two readings of what they said both fit, ask.

Every figure you report is one `traj` returned: to check one, run the read again. The tool owns balances, projections, FI dates and tax; you own asking the user for the facts that feed them. That split is the whole reason the tool exists.

Two write behaviours to use on purpose, wherever the schema lists them:

- **Dry run first.** It runs the real write and rolls it back, reporting the rows it would have created. Show the user those rows, then write.
- **Set an external reference on every write.** Replaying the same reference reports a duplicate at exit `0` instead of writing twice, which is what makes a retried write safe.

A flag that carries a document takes a path or `-`. `-` is the only way to send a document on stdin; it is never inferred from a pipe.

## Hand a job to the Skill that owns it

This is the contract, not a recipe, and it is not a router either: a Skill the agent has to hop through is one an unattended run skips.

When the user's request is a job with a Recipe — a bank import, a periodic review, a plan — the [Skill Manifest](https://github.com/trajectonomics/trajectonomics/blob/<commit>/skills/customer/skills.manifest.json), at the commit this Skill's scope pinned, names the Skill that carries it. Install that row in this Skill's own scope by its explicit name, then follow it. Do these three reads before any install.

1. **The scope.** Run `npx skills list --json` and `npx skills list -g --json`. A project list that names `traj` is this session's copy; when it does not, a global list that does is. A `traj` in the other scope belongs to another setup. When the resolved scope's list already names the job's Skill, install nothing and follow it.
2. **The pin.** Read the `commit` the resolved scope's lock records for `traj`. A project lock is `./skills-lock.json`; a global lock is `${XDG_STATE_HOME}/skills/.skill-lock.json` when `XDG_STATE_HOME` is set, and `~/.agents/.skill-lock.json` when it is not. The list reports no commit, so the lock is the only place it is read. Never install from `main`: a branch moves, and a person's setup must not.
3. **The row.** Read `skills.manifest.json` at that commit, and take the job's row and its `cliRange`.

**The version compared** is the session's pinned command-line version: the number from `traj --version`, or from `npx -y @trajectonomics/cli@latest --version` on the fallback. This Skill cannot read another Skill's file at run time, so the comparison rule is stated here: read the first `X.Y.Z` token, keeping any `-prerelease` suffix; compare the three numbers in turn and never the strings, so `0.10.0` is above `0.9.0`; and treat a pre-release as below its release, so `1.4.0-rc.1` is below `1.4.0`.

**Install** the row when the command line is at or above its CLI Range floor, the range's lower bound, using the pin and an explicit name:

```bash
npx skills add trajectonomics/trajectonomics/skills/customer#<commit> --skill <name> -y
```

Add `-g` to it in the global scope. Then confirm from the same scope's list that it landed. A row whose upper bound the command line has passed is installed all the same, and you say so in one sentence: name the range the Skill was checked through, and that `traj schema` is authoritative where the two differ.

Install nothing in these three cases:

- **Below the floor.** Skip a row below its floor, and name the row, the range it wants and the reason in one sentence, then do the part the schema allows.
- **No pin.** The lock records no `commit` for `traj` in that scope, because an older `skills` CLI wrote the entry, or its `source` is `trajectonomics/skills`, which is archived and does not have that commit. Say in one sentence that there is no pin, and that the person should re-run setup with `traj-onboarding` to get a pinned copy; then do the part the schema allows.
- **No row.** When the manifest has no row for the job, say `traj` has no Recipe for it yet and do the part the schema allows, rather than improvising the rest.

## What this version covers

Phase 1 is record, project and answer. V1 is THB and Thailand; the United States follows later, and multi-currency does not.

`traj schema` is the honest answer to "what can it do": read it before you promise anything. When a capability is absent from it — a second jurisdiction, an allowance optimiser, or projections and financial independence in an older release — say that this version of `traj` cannot answer it, offer the record-and-report part you can do, and leave the missing number missing rather than approximating it. Never fill a gap with arithmetic of your own, and never present an estimate as the tool's answer.

Every result you give the user states the as-of date it was read at, and whether tax is in it. A figure without those two is one they will misread.

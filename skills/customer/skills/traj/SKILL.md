---
name: traj
description: "Operate `traj`, the Trajectonomics command-line ledger, on someone's own money: record what they earned and spent, keep their accounts, check that the ledger balances, and read balances and reports. Use when someone wants to track their spending from a terminal, set up their accounts (for example to work out their Thai income tax estimate), record an expense or income, check their ledger, or asks about net worth or financial-independence questions; also whenever they name `traj`. It computes from a ledger and nothing else: it is no spreadsheet, gives no investment advice, and does not prepare, file or check a tax return."
metadata:
  cli: ">=0.2.0 <0.9.0"
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

`npx -y` runs code neither of you reviewed, so say why it is the safe choice here: the launcher verifies the published SHA-256 of the release binary. Nothing about it sends the user's data anywhere — and you send nothing either, never uploading or pasting their ledger, documents or exports. From 0.6.0 the CLI does send one anonymous usage count per command (the command's name, its exit code, the version and the operating system, never a figure or anything typed), and `DO_NOT_TRACK=1` stops it; the first successful command prints one line about it on stderr, which is a notice, not an error.

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
- Money is a decimal string at the currency's scale, with its currency (`"120.50"`), everywhere except inside a Scenario document: an amount you pass in a flag, a CSV `amount` cell, a transaction document, and every amount a ledger, report or projection result prints. Inside a Scenario document money is an integer of minor units, so `100000` is 1,000.00 THB, which is that document's form of the same amount and not a restatement. Where a command publishes `--decimal`, it reads or writes the same amounts as decimal strings: beside a `--set` or an `--add` it reads those amounts (`--set 'flows.salary.amount="90000.50"' --decimal`), and a whole-document form reads or writes every amount in the document. `traj schema` is the authority wherever it states a unit. Keep the unit the user's: restating one amount in a different unit is a second number you invented.
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

## Read a sign

Every Skill reads a sign from this section and states none of its own. `traj balance`, `traj report networth`, `traj report pnl` and the trial balance print raw signed units, and each row's `type` says how to read its sign:

| type | its normal sign | a figure on it reads as |
| --- | --- | --- |
| `asset` | positive | what they hold |
| `expense` | positive | what they spent |
| `liability` | negative | what they owe: `-2400.00` is a debt of 2,400.00 |
| `income` | negative | what they earned |
| `equity` | negative | the opening balances and offsets behind the other rows, never a figure about their wealth |

- **Net worth already counts every debt.** It is assets minus liabilities, and `traj balance` prints it as `netWorth` and `traj report networth` as `totals`. Quote that figure; adding a liability row's size to it, or subtracting the row from it, counts the debt twice.
- A liability whose balance moves towards `0` is being repaid, and one that moves further below `0` is borrowing.
- `traj report pnl` prints raw rows, income negative and expense positive, and its total is income minus expenses: positive when they earned more than they spent. Report the printed figure, say in words which way it points, and never flip a sign to make a sentence read better.
- **A write takes a magnitude, and the direction is `--from` and `--to`.** A negative `--amount` is refused with `NEGATIVE_AMOUNT`, exit `3`. Borrowing runs `--from` the liability `--to` the account that received the money; repaying runs `--from` the account that paid `--to` the liability.
- **`--opening` is the one signed write.** It reads `--from` as equity and `--amount` as signed, so an opening debt is a negative amount, as in `traj tx add --opening --from Opening --to Mortgage --amount -2400.00 --date 2026-01-01`. From 0.3.0 the command line refuses a positive opening on a liability with `liability_opening_positive`, exit `3`, and its `hint` names the signed amount. On 0.2.0 a positive opening is accepted and the debt reads as a gain, in net worth too, so a negative amount is the only correct entry at every release in the CLI Range.

## Hand a job to the Skill that owns it

This is the contract, not a recipe, and it is not a router either: a Skill the agent has to hop through is one an unattended run skips.

When the user's request is a job with a Recipe — a bank import, a periodic review, a plan — the [Skill Manifest](https://github.com/trajectonomics/trajectonomics/blob/<commit>/skills/customer/skills.manifest.json), at the commit this Skill's scope pinned, names the Skill that carries it. Install that row in this Skill's own scope by its explicit name, then follow it. Three reads come before any install.

1. **The scope.** Run `npx -y skills@1.9.0 list --json` and `npx -y skills@1.9.0 list -g --json`. A project list that names `traj` is this session's copy; when it does not, a global list that does is. A `traj` in the other scope belongs to another setup.
2. **The pin.** Read the `commit` the resolved scope's lock records for `traj`. A project lock is `./skills-lock.json`; a global lock is `${XDG_STATE_HOME}/skills/.skill-lock.json` when `XDG_STATE_HOME` is set, and `~/.agents/.skill-lock.json` when it is not. The list reports no commit, so the lock is the only place it is read. Never install from `main`: a branch moves, and a person's setup must not.
3. **The row.** Fetch `skills.manifest.json` from `skills/customer` in `trajectonomics/trajectonomics` at that commit, and take the job's row and its `cliRange`. When the resolved scope's list already names that row's Skill, install nothing and follow it.

**The version compared** is the session's pinned command-line version: the number from `traj --version`, or from `npx -y @trajectonomics/cli@latest --version` on the fallback. This Skill cannot read another Skill's file at run time, so the comparison rule is stated here: read the first `X.Y.Z` token, keeping any `-prerelease` suffix; compare the three numbers in turn and never the strings, so `0.10.0` is above `0.9.0`; and treat a pre-release as below its release, so `1.4.0-rc.1` is below `1.4.0`.

**Install** the row when the command line is at or above its CLI Range floor, the range's lower bound, using the pin and an explicit name:

```bash
npx -y skills@1.9.0 add trajectonomics/trajectonomics/skills/customer#<commit> --skill <name> -y
```

Add `-g` to it in the global scope. Then confirm from the same scope's list that it landed. A row whose upper bound the command line has passed — a pre-release of that bound's minor counts as past it — is installed all the same, and you say so in one sentence: name the range the Skill was checked through, and that `traj schema` is authoritative where the two differ.

Install nothing in these four cases:

- **Below the floor.** Skip a row below its floor, and name the row, the range it wants and the reason in one sentence, then do the part the schema allows.
- **No pin.** The lock is missing, or records no `commit` for `traj` in that scope because an older `skills` CLI wrote the entry, or the entry's `source` is `trajectonomics/skills`, which is archived and does not have that commit. Say in one sentence that there is no pin, and that the person should re-run setup with `traj-onboarding` to get a pinned copy; when the copy without a pin is a project copy, they first run `npx -y skills@1.9.0 remove traj` in that project, because setup now installs globally and the project copy would still win here. Then do the part the schema allows.
- **No manifest.** When `skills.manifest.json` cannot be fetched or read at the pin, say so in one sentence and do the part the schema allows: the contract stays authoritative, and nothing is installed blind.
- **No row.** When the manifest has no row for the job, say `traj` has no Recipe for it yet and do the part the schema allows, rather than improvising the rest.

## What this version covers

Phase 1 is record, project and answer. V1 is THB and Thailand; the United States follows later, and multi-currency does not.

`traj schema` is the honest answer to "what can it do": read it before you promise anything. When a capability is absent from it — a second jurisdiction, or projections and financial independence in an older release — say that this version of `traj` cannot answer it, offer the record-and-report part you can do, and leave the missing number missing rather than approximating it. Never fill a gap with arithmetic of your own, and never present an estimate as the tool's answer.

Every result you give the user states the as-of date it was read at, and whether tax is in it. A figure without those two is one they will misread.

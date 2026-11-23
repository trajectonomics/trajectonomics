# trajectonomics

`traj` is a free and open source command line for personal money. An AI agent operates it.
The command line never calls a model, so every result is repeatable.

The landing page is [trajectonomics.com](https://trajectonomics.com/) and the docs are at
[docs.trajectonomics.com](https://docs.trajectonomics.com/).

## Install

Linux and macOS, one line (verifies the release checksum, installs `traj` to `~/.local/bin`,
or `$TRAJ_INSTALL_DIR`, and prints what it installed):

```bash
curl -fsSL https://github.com/trajectonomics/trajectonomics/releases/latest/download/install.sh | sh
```

Windows, one line (installs to `%LOCALAPPDATA%\traj\bin`, adds it to the user `PATH` once,
and needs a new shell afterwards):

```powershell
irm https://github.com/trajectonomics/trajectonomics/releases/latest/download/install.ps1 | iex
```

npm, on any machine with Node 20 or later, or with Bun (`npx` needs no Bun; the package
fetches the release binary on first run and caches it under `~/.traj/bin`):

```bash
npx @trajectonomics/cli@latest --version
bunx @trajectonomics/cli@latest --version
```

Then give your agent the setup skill:

```bash
npx skills add trajectonomics/trajectonomics/skills/customer --skill traj-onboarding -y
```

The setup skill asks about your situation and goal, then its second step installs the `traj`
operating skill from `skills/customer` in this repository, the folder both skills publish from.

```bash
npx skills add trajectonomics/trajectonomics/skills/customer --skill traj -y
```

That is the operating skill on its own, for an agent that is already set up. Both commands
use `npx`, so they need Node, which the npm channel already requires; the install scripts
do not.

Which channel: all three end at the same compiled binary and the same version. Use the
script for a machine that should keep `traj` on `PATH`, npm when you already have Node or
Bun and want one command. Pin a release with `TRAJ_VERSION=X.Y.Z` for the script, or
`@X.Y.Z` for npm.

Uninstall by deleting the one file: `~/.local/bin/traj`, `%LOCALAPPDATA%\traj\bin`,
`~/.traj/bin` (the download cache only; your ledger is beside it), or nothing at all for
`npx`.

`traj` keeps the ledger in `~/.traj/traj.db`, or in `traj.db` inside `TRAJ_HOME` when that is
set, the same path on Linux, macOS and Windows. Beside it is the disposable `bin/` download
cache; deleting the data directory deletes the ledger. Take a lossless copy with:

```bash
traj export --format jsonl --out backup
```

`--out` names a directory that must not exist yet, and JSONL is the only lossless export
format.

## Your first commands

The ledger is one record, and the first run builds it in order:

```bash
traj init
traj account add Cash --type asset --currency THB
traj account add Food --type expense --currency THB
traj tx add --from Cash --to Food --amount 120.50 --date 2026-03-01
traj balance --as-of 2026-03-31
traj report networth --as-of 2026-03-31
```

`init` creates the data directory and an empty ledger. An account is a place money sits or
comes from, and a transaction moves an amount from one to another. Every read states its own
date and never reads the clock, so the same command always answers the same question.

`traj help` lists every command, `traj help <command>` lists one command's flags, and
`traj schema --json` prints the whole contract: every command's input, output and error codes.

## Importing a statement

To load a bank statement, fill the one CSV template instead of adding each transaction by
hand. `traj tx import` has been in every release since 0.1.0.

```bash
traj tx import --template     # print the template header and nothing else
traj tx import statement.csv --dry-run
traj tx import statement.csv
```

`--template` prints the header the importer reads, and it opens no data directory:

```csv
date,from,to,amount,memo,external_ref,project
```

Start your file with that header and write one row per transaction. `--dry-run` reports every
row and rolls every write back, so run it first. A file name of `-` reads the CSV from stdin, as in
`traj tx import - --dry-run`. The import is all or nothing, and `external_ref` is the duplicate
key, so importing the same statement twice adds nothing the second time. Each command's flags and
the rest of the columns are in
[the `tx` page of the docs](https://docs.trajectonomics.com/cli/commands/tx/).

## Development

The sources are Bun-only; a released binary needs nothing.

```bash
bun install
bun run dev -- --help     # run from source
bun test
bun run build             # single-file binary at dist/traj
bun run lint              # Biome, zero warnings
bun run format            # Biome format + import order, writes files
bun run check             # lint + typecheck + test + build, what CI runs
```

From a checkout, run the CLI with `bun run dev -- …`. The npm launcher refuses the
`0.0.0` a checkout carries, because that version is never a release; set
`TRAJ_BINARY_PATH` to run a binary you built with `bun run build`.

## Reading the future

Three read-only commands run a stored Scenario over the Baseline the ledger
states at a date: `traj projection run` rolls net worth up year by year,
nominal and real (monthly rows with `--monthly`); `traj projection compare`
puts two Scenarios side by side, or one against a `--set` what-if, with the
deltas in FI date, net worth at the ages you name and run-out year; and
`traj fi` reports the survival FI date beside the 25× rule of thumb as a
labelled reference. Every date flag is a Gregorian year between 1900 and
2100, so a Buddhist year is refused instead of read as 543 years later. Every result states its As-of, the engine version, the
Scenario's hashes, the Overrides it applied, and its tax status.
`traj schema <command>` describes each one.

Each result also says what every tax year owes: `taxYears` in JSON, and the
`taxYears` table in the human format. A row names its Levy, the period and the
day it settles, what it owed before Prepayment, what was already paid at source,
and the `owed` figure — due minus prepaid, so a refund is negative. `settled`
says whether the settlement date falls inside the Projection, and `partial`
whether the Projection ended before the period did, so a figure that is still
ahead of you is never mistaken for one already charged.

Tax is the Scenario's. `traj scenario tax <name> --tax th-2026` writes Thailand's
2026 personal income tax into it, and `--label salary=income.section40_1` says
which Section 40 class each income Flow belongs to, because a Levy tallies
labels and never guesses them; `--none` takes both out again, with the
Prepayments that named the Levy. A Scenario without the Levy is projected
pre-tax, and every result says which it is.

A real employee's profile goes in on the same command: `--filing-status`,
`--children`, `--parents`, `--disabled-care`, `--social-security`,
`--life-insurance`, `--health-insurance`, `--parent-health-insurance`,
`--spouse-life-insurance`, `--mortgage-interest`, `--donation2x` and
`--donation1x`, each in THB except the counts. `@trajectonomics/tax` applies
every statutory ceiling; the CLI holds no amount of its own. The write reports
which deduction classes the flags stated and which they left out, so a
deduction nobody stated is visible rather than assumed to be zero. It states
what the flags said, never what tax-core applied: a premium the statute does
not allow for the filing status is still stated, and the Levy zeroes it.

```json
{
  "status": "updated",
  "allowances": {
    "stated": ["lifeInsurance"],
    "notStated": ["children", "socialSecurity", "mortgageInterest", "donation1x"]
  }
}
```

A Projection that starts inside a tax period also needs what that period had
already taken: `--carry-in carry-in.json` states it, one record per Scenario,
Levy and period, with a `"0.00"` for every class the period had no income in or
one `"rest": "0.00"` for all the rest. The result echoes every record it used
and where it came from, and one that starts on a period boundary needs nothing:

```json
[
  {
    "scenario": "base",
    "levy": "th-2026-pit",
    "periodStart": "2026-01-01",
    "tallies": [{ "label": "income.section40_1", "basis": "gross", "amount": "0.00" }],
    "prepaid": "0.00",
    "rest": "0.00"
  }
]
```

## Chance of success

> **Ships in 0.8.0.**

`traj projection chance` runs one Scenario over seeded Market paths and reports
the share that never run out before the Horizon, with the net-worth Bands at each
year. The paths draw from a Return model you state in a JSON file, with
`--return-model`, and `--paths` and `--seed` are required, so the same model,
seed and count always give the same answer. The CLI ships no Return model: which
market history a plan is tested against is your decision, and every figure is
only as good as that choice. `traj schema projection chance` describes the file.
Pass the same three flags to `traj dashboard` to add the chance of success to the
Dashboard, as a page of its own.

## Money as decimals in a Scenario

> **Ships in 0.8.0.**

`traj scenario show base --decimal` prints a Scenario with each amount as a decimal string of the
Currency's major unit, such as `"1000.00"` for 100000 satang, and
`traj scenario apply base --file base.json --decimal` reads that form back. The stored plan is the
same either way: saving what `show --decimal` printed leaves it unchanged. A value with more places
than the Currency has is refused, never rounded.

## A what-if, applied to the plan it came from

> **Ships in 0.8.0.**

`traj projection run --set` projects a change without saving it. `traj scenario apply` saves the same
change to the stored plan, so the plan you keep is the one you projected. It takes the `--set`,
`--without` and `--decimal` that `projection run` takes, and refuses what they would be refused for:

```bash
traj scenario apply base --set flows.salary.amount=9000000 --dry-run
traj scenario apply base --set flows.salary.amount=9000000 --without flows.gym
```

The result names the Overrides it wrote. A change that leaves the plan as it is writes nothing and
exits 0. `--if-hash <contentHash>` writes only when the stored plan still has that hash, as
`traj scenario show` printed it, and refuses the write otherwise. Without `--file`, `--set` and
`--without` never take a document, so the what-if cannot replace a plan you did not read.

## Milestones: points in the plan that a Flow waits for

> **Ships in 0.8.0.**

A Scenario may name points in the plan a Flow can wait for: a date, a number of months after another
point, a net-worth or spending figure, or a multiple of spending. They are the `milestones` of the
Scenario document, and `traj schema scenario apply` lists every key. A Flow's `startAt` lands it on
or after a point's date, and its `endAt` before it. `traj projection run` reports each point's date,
or that it was not reached, in a `milestones` table, and `traj projection compare` reports them under
each side.

```json
"milestones": [
  {
    "id": "retire",
    "combine": "all",
    "criteria": [
      { "id": "wealth", "kind": "metric", "metric": "accessibleNetWorth", "op": "atLeast", "amount": 50000000, "terms": "real" },
      { "id": "age", "kind": "date", "on": "2045-01-01" }
    ]
  }
]
```

## Where each year's money went

> **Ships in 0.8.0.**

`traj projection run --breakdown` adds each Annual roll-up's cash flow as the engine routed it: each
Flow's income, the tax taken at source and each Levy's settlement (a refund is negative), each expense
and its category, each Contribution applied and the part the cash could not fund, each planned
withdrawal, what `cashflow.withdraw` drew and what `cashflow.surplus` filled. In JSON it is the
`cashflow` table, one row per line. In the human format it is one block per year, after the body:

```
cash flow 2026-03-31 to 2027-03-30 (13 rows)
line                  amount
money in           124500.00
  income           120000.00
  withdrawals        3000.00
  drawn              1500.00
tax                  4200.00
spending            50700.00
  housing           30000.00
  food              18000.00
  transport          1500.00
  (uncategorised)    1200.00
saving              64800.00
  unfunded          19200.00
left over            4800.00
```

Each total is the engine's figure, or an exact sum of the engine's own lines, so the CLI adds no figure of
its own. Money in equals money out in every year: the engine routes every unit of cash.

## Seeing it in a browser

`traj dashboard --as-of 2026-11-30 --horizon 2056-11-30` reads your ledger once and serves the Dashboard (net worth, the ledger, projections, the FI date, a Scenario compare, tax and health) on `http://127.0.0.1:4321/` until you press Ctrl-C. It only reads, it listens on this machine only, and it takes the same Scenario flags as the projection reads (`--scenario`, `--compare` twice, `--monthly`, `--carry-in`); `--port 0` picks a free port. Run it again to see new figures.

## Keeping a backup, and removing the data

Four commands keep the ledger recoverable. `traj doctor` checks the data directory, the
database and every stored transaction and says what is wrong without changing anything;
`--as-of` adds the trial balance at a date. It exits 0 when its checks ran, with `"ok": false`
when one found a problem, because the finding is the answer; a non-zero exit is for what the
command could not do at all.

`traj backup --out backup` writes `traj.jsonl`, the canonical dump, into a directory that must
not exist yet, and `traj restore backup` writes it into an empty data directory byte for byte.
A restore refuses a database that already holds data: to replace live data, remove it first,
or restore into a second `TRAJ_HOME`. CSV and Markdown exports are for people; only the JSONL
restores.

`traj data remove` deletes `traj.db` and nothing else, so the launcher's `bin/` cache beside it
survives. It prints what would be lost, and it refuses unless `--confirm` names the data
directory's own path and `--backup` names a backup whose bytes are the data's, so a removal
cannot outrun the last write:

```bash
traj doctor --as-of 2026-11-30
traj backup --out ~/traj-backup-2026-11-30
traj data remove --confirm ~/.traj --backup ~/traj-backup-2026-11-30
```

### Going back after an upgrade

> **Ships in 0.8.0.**

When a newer `traj` has to migrate your database to a newer schema, it first copies it beside the
original as `traj.db.pre-v<N>.bak`, where `N` is the schema version the copy holds, and says so once
on stderr. Each copy is about the size of the database, so the upgrade needs that much free space;
if the copy cannot be written (a full disk, a directory that is not writable) the database is not
migrated and nothing changes. A new, empty ledger is not copied.

An older `traj` refuses a database a newer one has migrated, so to go back: stop every `traj`,
install the release you used before (the
[releases page](https://github.com/trajectonomics/trajectonomics/releases) lists them; `traj doctor`
on it reports the schema version it writes as `head`, which must equal `N`), delete `traj.db`,
`traj.db-wal` and `traj.db-shm` in the data directory, and copy the `.bak` file to `traj.db`.
Changes made after the upgrade are lost: the copy is the database as it was.

`traj doctor` lists the copies as `database.preMigrationCopies`, and any half-written one a crash
left as `database.unfinishedCopies`. `traj data remove` leaves the copies, because they are separate
files you can delete when you no longer need them, and its refusal names them: they hold your
data in plain text.

## Telemetry

`traj` counts its own use, so the project can see how many people run it each week. After a command finishes, a detached process sends one anonymous event to PostHog (EU), so the command never waits for the network. The event holds:

- `command`: the command name, such as `tx add`, or nothing when the command line named none
- `exit_code` and `error_code`: how the run ended, such as `invalid_input`
- `format`: `human` or `json`
- `version`, `os` and `arch`: the CLI version and the platform

It never holds your ledger, arguments, flag values, account names, amounts, file paths, the data directory or any environment variable. As with any web request, PostHog sees the IP address the request comes from.

The random id that groups one machine's events is in `telemetry.json`, in `$XDG_CONFIG_HOME/traj` (or `~/.config/traj`), or in `%APPDATA%\traj` on Windows. It lives outside the data directory, so `traj data remove` does not delete it. `traj telemetry off` deletes it. A machine where that file cannot be written sends nothing.

There are three ways to stop it:

- `traj telemetry off`, which stores the choice for this machine
- `DO_NOT_TRACK=1` in the environment of the command
- `TRAJ_TELEMETRY=0` (or `off` or `false`) in the environment of the command

CI runners (where `CI` is set) and development builds never send. The first successful command prints one line on stderr that says so, and it prints it once. `traj telemetry status` shows whether counting is on and why, and `traj telemetry on` turns it back on; a `DO_NOT_TRACK`, `TRAJ_TELEMETRY` or `CI` setting still stops it, and the status says which one.

## Docs

- [`GLOSSARY.md`](GLOSSARY.md): the project's vocabulary.
- [`docs/adr/`](docs/adr/): design decisions and why.
- [`docs/runbooks/releasing.md`](docs/runbooks/releasing.md): cutting and repairing a release.
- [`ROADMAP.md`](ROADMAP.md): phases and recorded next steps.

## Adding a command

Create `src/commands/<name>.ts` (or `src/commands/<group>/<name>.ts` for a
nested one) with `defineCommand`: a summary, an input schema, an output schema,
examples, the error codes it raises, and a `run` that returns `ok(data)` or
`fail(code)`. Register it in `src/commands/index.ts`, inside a `defineGroup` if
it is nested. Fields of the input schema that are not positionals become flags
automatically (`fromDate` is `--from-date`). A new failure is a new entry in the
registry in `src/registry.ts` with its exit class; add it to `RETRYABLE_CODES` there only when
retrying the same command can succeed. An input-validation sentence
comes from the shared table beside it, so a new command needs no wording of its
own. Commands never format output or
exit; `traj help <path>` and `traj schema <path>` are generated from the same
schemas that validate them. Test through `run(argv, io, env)`, which needs no
process. See ADR 0015.

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

To chart net worth over time, state every month-end of a period in one read instead of one
call per month:

```bash
traj report networth --monthly --since 2026-01-01 --until 2026-03-31
```

Each month is exactly what `--as-of` gives for that date.

A figure that sums accounts (net worth, the trial balance's debit and credit columns, the P&L's income
less expenses) can leave the safe integer range though every account is inside it. The read still
exits 0 and states every account, and states that figure as `null` with an error object beside it
(`netWorthError`, `totalsError`); the text form prints a sentence in its place. A figure inside the
range carries no error key. Run `traj schema balance` or `traj schema report pnl` for the exact shape.

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

The write keeps that profile beside the Scenario, and `traj scenario show` prints
it back as `tax`. `--merge` then changes only the flags it carries
(`traj scenario tax base --merge --children 2`) and keeps the rest, and
`--from-stored` writes the Levy again from the profile, for example after a
tax-year update. Both need a stored profile: a plan taxed before it was kept
states its profile whole once. `--if-hash` refuses a write over a plan that
changed since you read it, as on `scenario apply`.

```json
{
  "status": "updated",
  "allowances": {
    "stated": ["lifeInsurance"],
    "notStated": ["children", "socialSecurity", "mortgageInterest", "donation1x"]
  }
}
```

A couple who file jointly get each spouse's own expense ceiling. When the plan's household
has a partner and `owners` that say whose each Flow and Account is,
`--filing-status married_joint` writes one Levy over both people as Filers: the CLI adds the Owner's suffix to each tax label (`income.section40_1@me`,
`@partner`, or `@shared` for income of both), so state the bare label as before.
Section 42 bis gives each spouse their own 50% expense, capped at 100,000, even on a
joint return, which one Levy over a single label could not apply. Salaries of
1,000,000 and 500,000 owe 160,000 this way, where a Levy over one label owes
185,000. A taxed Flow with no Owner, or a person id that is not 1 to 32 lowercase
letters, digits or hyphens, is refused by name. A plan without a partner or without
`owners` writes the bare labels it always wrote, for every filing status. The result
lists the `filers` when it has any, and the household's Owners are read each time the
tax is written, so after changing them run `traj scenario tax <name> --from-stored`.

A couple who file separately get one Levy each. `--filing-status married_separate` writes
`th-2026-pit@me` and `th-2026-pit@partner`, one per person who has a labelled Flow or
Account, with the same Owner suffixes. Each Prepayment of the tax moves to the Levy of its
Flow's Owner (a Prepayment of a Levy of your own stays). A `shared` Flow's Prepayment is
split half to each, and its capped Prepayment stays whole on the holder's. Each allowance
flag takes a person (`--parents partner=2`) so each Return states its own claims, a bare
value names the holder, and each Return's children default to 0. A value for someone with
no income is refused, because no Return carries it. A Return claims at most its own two
parents. Interest on one loan borrowed together is stated once, as `--mortgage-interest
shared=60000`: each Return claims half, an odd satang goes to the holder, and a sole
person with income claims it all. The shared total is at most 100,000 baht
(`MORTGAGE_OVER_CEILING`), and `shared=` is refused under any other filing status. A
person's own `--mortgage-interest` is for their other loans, and each Return claims at
most 100,000 baht of its own interest and its share together. `traj` cannot tell which
loan interest is on, so when both claim their own, a loan's Owner is `shared` and no
shared interest is stated, the result's `assumptions` say the loans are taken to be
separate. `--merge` and `--from-stored` keep the stored `returns` and
`sharedMortgageInterest`, and `--merge` to `married_joint` keeps the partner's Return and
the shared interest for a later switch back; a joint Return claims neither, so state its
interest bare. A write that claims neither says so in `unclaimed`, with how to claim them,
and a separate filing names there each person who has stored claims and no taxed income.
The stored profile's `claimsHolder` says whose claims its other keys are, so if the
household swaps which person is the holder, each person's claims stay theirs. A
`projection run` then reports a `filer` on each `taxYears` entry, `--carry-in` takes one
record per Levy, and `projection allowances` answers per Return.

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

A Levy over Filers reads Filer labels, so its record names them: each of its 29 classes
once per Filer (`income.section40_1@me`) and its 22 income classes once more for income
of both (`income.section40_1@shared`), 80 for two Filers where a Levy over one label has
29. A missing class is listed by name, and a bare label is refused.

## Chance of success

> **Ships in 0.8.0.**

`traj projection chance` runs one Scenario over seeded Market paths and reports
the share that never run out before the Horizon, with the net-worth Bands at each
year. The paths draw from a Return model you state in a JSON file, with
`--return-model`, and `--paths` and `--seed` are required, so the same model,
seed and count always give the same answer. The CLI ships no Return model: which
market history a plan is tested against is your decision, and every figure is
only as good as that choice. `traj schema projection chance` describes the file.
Or pass `--return-model plan` to build the model from the plan itself: each asset
Account's `rate` and its `volatility` (the standard deviation of its yearly
return, in basis points, which you write into the Scenario). `--buckets` sets its
size (a power of two from 16 to 1024, 256 by default), the result echoes what it
was built from as `returnModel`, and `traj projection model --scenario NAME`
prints the model as JSON, a file `--return-model` reads back. A plan with no
`volatility` is refused, because every path would be the same path.
Add `--outcomes` to see what each path came to: its closing and lowest net
worth, the year it was lowest and when it ran out, with the paths at the 10th,
50th and 90th percentile, the earliest to run out and the lowest named as
`representative` (the human form prints every path, worst first). Then
`traj projection path --index N`, with the same flags, replays path N year by
year: `projection run`'s result, with the same flags for the cash flow and each
Account's value, plus the market return each Account drew in each year as
`returns`. An index is a path's name under the seed, so it is from 0 to
`--paths` minus 1.
Pass `--paths` and `--seed` to `traj dashboard` to add the chance of success to the
Dashboard, as a page of its own: it uses `plan` unless you name a
`--return-model` file.

## Tax allowances

> **Ships in 0.8.0.**

`traj projection allowances` reads a Scenario that has a tax Levy and says, for each
whole tax year the Projection holds, how much more of each contribution label (RMF, ThaiESG
and the others the Levy reads) would still lower the tax, and by how much. You name the
labels in the order they should fill with `--labels`, and the size of one step with
`--step`, in major units: the CLI ships no default. `--budget` caps what the extra
contributions may add up to in a year, and `--min-saving` is the least percent of a step
a step must save. Each suggestion comes with the contribution Flow that would apply it,
which you add to the Scenario yourself: the command writes nothing. The figures are one
plan's own tax rules, an estimate and not tax advice, and each fund's holding rules are
not checked. A year that ended before the As-of, and a year the horizon cuts short, are left out; the
current year is included, and when the As-of falls mid-year it needs `--carry-in`, the
record of what was already contributed in that year earlier. `traj schema projection allowances`
describes the result.

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

### Adding an item to a what-if

> **Ships in 0.8.0.**

`--add <list>=<json>` puts one new item on the end of `accounts`, `flows` or `milestones`, so a new
loan, an extra payment or a new Flow can be tried before it is saved. The item carries its own `id`,
and an `id` the list already holds is refused (`--set` is the flag that changes an item that exists).
Every read that takes `--set` takes `--add` (`projection run`, `projection compare`, `fi`,
`projection chance` and `projection allowances`), and `scenario fork` and `scenario apply` save it:

```bash
traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 \
  --add 'flows={"id":"extra","kind":"expense","amount":"1000.00","frequency":"monthly","start":"2026-04-01","growth":{"bps":0}}' --decimal
traj scenario apply base --add 'flows={...}' --decimal --if-hash <contentHash>
```

The flags apply in a fixed order whatever order they are typed in: every `--without`, then every
`--add`, then every `--set`. So a `--set` can reach an item the same command adds
(`--add` then `--set flows.extra.amount=...`). An `--add` never replaces: one whose `list.id` the same
call's `--without` took out is refused, and `--set <path>.<key>=<value>` changes an item field by field,
so no field is dropped by accident and the plan saved is the plan projected. The result lists the items it added under `additions` (absent when none were), and
`effectiveContentHash` covers them. The engine checks the document with the item in it, so a refusal names
`--add` and the item's path (`flows.extra`) with the document path inside it. Under `--decimal` the
item's money is a decimal string of the Currency's major unit. Nothing is written until
`scenario apply` or `scenario fork` is run with the same flags.

## Naming plans, keeping notes on them, and marking the main one

> **Ships in 0.8.0.**

A person who compares "retire at 55" with "retire at 60 and buy a condo" ends up with several plans.
`traj scenario rename early retire-at-55` gives a plan a better name and keeps its id, document and
`contentHash`. `traj scenario notes retire-at-55 --text "Sell the condo in 2031."` keeps plain text
on it (`--file <path>` or `--file -` reads it, `--clear` removes it), and `scenario show` prints it
back as `notes`. Notes are not part of the plan, so they never change its `contentHash`, and a
`scenario fork` copies them unless it is given `--no-notes`.

`traj scenario main retire-at-55` marks one plan as your main plan, and `scenario list` and
`scenario show` print `main`. It is a label and not a default: `projection run` and every other read
still need `--scenario`. `scenario rm` of the main plan is refused until another is chosen
(`scenario main --clear` takes the mark off), or removed anyway with `--force`.

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
`cashflow` table, one row per line. Its section totals are the `cashflowTotals` table beside it: nine rows per year,
in the order money in, tax, withdrawals, drawn, spending, saving, not funded, left over and unmet. The `cashflowTotals` table
and the human block come from one function (`cashflowTotalsOf`), so they cannot disagree. JSON states a zero total as `0.00`; the human block
leaves out a zero not funded or unmet, and withdrawals, drawn or tax when its roll-up has no line of that group. In the
human format it is one block per year, after the body:

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
not funded          19200.00
left over            4800.00
```

Each total is the engine's figure, or an exact sum of the engine's own lines, so the CLI adds no figure of
its own. In every year, money in plus `unmet` (the cash a Shortfall left unpaid) equals tax, spending,
saving and left over: the engine routes every unit of cash. `not funded` is the part of the
Contributions the cash could not fund; it is not in saving.

## Where the money goes, and moving it between Accounts

> **Ships in 0.8.0.**

`cashflow` takes three more forms, every figure in them the caller's own (`traj` ships none): a surplus step's `share`, which takes that
many basis points of what is still unrouted instead of everything (a percent string such as `"30.00"` under `--decimal`); a `withdraw` entry that is `{ account, downTo }`, which keeps a Reserve floor
in the Account while the others are drawn; and an `upTo` or `downTo` that is `{ amount, growth }`, which keeps its value in today's money. A
Flow of `kind: "transfer"` moves money between two of the plan's own Accounts, outside cashflow: a provident fund rolled into a locked RMF, or
a monthly amount from savings paying a loan down. `traj schema scenario apply` describes each, and `--set` reaches a step or an entry by
its position, so "what if I kept 100,000.00 in savings before touching the funds" is
`traj projection run --scenario plan --set cashflow.withdraw.0.downTo=10000000`.

`traj projection run` states what each did: the annual row's `transfers`, a `routing` echo of every step and entry by position,
and with `--breakdown` the `entry` each drawn line came from and a `transfers` table (what moved and what could not); with
`--liabilities`, `transferred` on a loan's months. The amount a target that keeps its value is worth on a later date is the engine's
and is not stated yet. A plan without these forms prints exactly as before.

## Loans

> **Ships in 0.8.0.**

A loan is three parts of a Scenario document: a liability Account with a nominal `rate` and a `compounding`
period, a `withdrawal` Flow from that liability when the money arrives, and a Contribution into the
liability whose amount is a `level` payment. `traj schema scenario apply` publishes one as its worked example.

`traj projection run --liabilities` adds the engine's statement of each loan: one month row per liability
(`opening`, `drawn`, `paid`, `interest`, `closing`) and each loan's paid-off date. The rows shown are
one loan's months, cut from the table; it lists every liability the Scenario holds. In JSON they are the
`liabilities` and `paidOff` tables. The human format prints one line per loan, then its months:

```
car: paid off on 2026-12-01
liabilities (26 rows)
account                               from        to            opening     drawn     paid  interest    closing  partial
car                                   2026-06-01  2026-06-30       0.00  12000.00     0.00     58.00   12058.00  false
car                                   2026-07-01  2026-07-31   12058.00      0.00  2035.15     50.44   10073.29  false
car                                   2026-12-01  2026-12-31       9.66      0.00     9.66      0.00       0.00  false
```

The figures are the engine's: `interest` is the residual of the month, so `opening + drawn − paid + interest`
equals `closing` exactly. Without `--liabilities` the output is unchanged.

### What a fee and a payout came to over the plan

> **Ships in 0.8.0.**

An asset Account can pay out a share of its value as income (`payout`) and be charged a yearly `fee`.
`traj projection run` states each one's total over the whole horizon, so nothing needs adding up: the
engine sums them in the same run as the roll-ups (it is the sum of the `payouts` and `fees` of every
roll-up). Two fields appear, and only when the Scenario declares the item above 0 bps (0 bps is none):

- `accountLifetimes`: one `{ account, lifetimeFees?, lifetimePayouts? }` per Account that declares a fee or a payout,
  in Scenario order. `lifetimeFees` is there when the Account carries a fee, `lifetimePayouts` when it carries a
  payout; each is `0.00` if the Account never charged or paid.
- `lifetimeFees`: the fees of all Accounts together, present only when an Account carries a fee.

Both are money as every figure is, a decimal string at the currency's scale (`--decimal` changes what you
write, not what is read). The human format prints the plan-wide fees on a line of their own, then each
Account's totals as a table, and `projection path` states the same fields for a Market path:

```
Fees over the plan, all accounts: 1514.01

accountLifetimes (1 row)
account  lifetimeFees  lifetimePayouts
fund          1514.01          4051.89
```

Without a fee or a payout the output is unchanged.

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

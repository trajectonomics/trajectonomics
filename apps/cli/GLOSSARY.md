# trajectonomics

A command line for managing personal resources, money first. It records what actually happened, derives a starting point from it, and projects the future under stated assumptions.

## Language

### Layers

**Ledger**:
The append-only record of what actually happened to money: accounts, transactions, and their postings.
_Avoid_: Books, journal

**Baseline**:
The starting state of a projection, derived from the ledger or written by hand: what each account holds at an as-of date. Income and spending are assumptions about the future, so they belong to the scenario, not the baseline.
_Avoid_: Snapshot, current state

**Baseline mapping**:
The one connector between the ledger and the simulation: it turns balances at an as-of date into a baseline. Neither core imports the other, so the mapping lives here.
_Avoid_: Adapter, bridge, sync

**Scenario**:
A named set of assumptions about the future: economy, accounts, streams, events and cash flow rules. FI settings and the horizon are not part of it; a command takes them (ADR-0030).
_Avoid_: Forecast, model

**Projection**:
The month-by-month result of running a baseline through a scenario. The same baseline and scenario always give the same projection.
_Avoid_: Run, output

**Cash-flow breakdown**:
The lines one Annual roll-up of a Projection is made of, by source, tax, category and Account, as the engine routed them (`projection run --breakdown`, ADR-0058). Each total is the engine's figure or an exact sum of its lines, and money in plus unmet equals money out.
_Avoid_: Cash-flow statement, budget, flow report

**Real asset**:
A home, a car or another thing owned that stays in net worth but is not spent: not a model of its own, but an asset Account marked `liquid: false` that no routing list names, an obligation Contribution that buys it, an optional loan, Flows whose amounts read its value, and a planned withdrawal that sells it, with a payoff that repays its loan from the sale (ADR-0060). Its ids follow `<asset>-purchase`, `-running`, `-rent`, `-sale`, `-loan` and `-loan-payoff`, a convention the Dashboard writes and reads that the core never sees.
_Avoid_: Property (as a type), fixed asset, holding

**Spending rule**:
A fourth way to state an expense Flow's amount, `rule` beside `amount`, `derive` and `level`: its yearly amount follows what a portfolio of asset Accounts is worth, fixed once per Rule year (sim ADR-0023). `initialRate` fixes the first year's amount as a share and grows it by inflation, `currentRate` takes a share of what the portfolio is worth each year (with optional dated rate steps, a floor and a ceiling), and `guardrails` cuts the amount after the share has grown too large and raises it after it has grown too small. The rule is the engine's, and `traj` ships no rate, band, bound or rounding for it: every figure is the caller's. `projection run --spending` states each Rule year (ADR-0063), and `projection chance` states what a rule pays across Market paths as spending Bands and a lowest year. A fixed amount that keeps pace with inflation is an ordinary expense with `growth: "inflation"`, not a rule.
_Avoid_: Retirement plan, withdrawal strategy, safe withdrawal rate (a rate is the caller's, not a default)

**Estate**:
What a plan would leave on a date: everything owned (locked and illiquid Accounts and a home included), less what is owed, less the settlement costs, less the gifts, which is what heirs receive (sim ADR-0025). The optional `estate` block of a Scenario states its costs and gifts, every one the caller's own: `traj` ships none and models no inheritance tax, so a tax or a transfer fee is a cost line the caller types. `projection run --estate` states each roll-up's end (ADR-0064). A what-if may begin the block on a plan that lacks it with `--set estate=<json>` (ADR-0065). It changes no other figure of a Projection.
_Avoid_: Inheritance (as the figure), legacy, will

**As-of**:
The date a result is evaluated at. Every result states it.
_Avoid_: Today, now, snapshot date

### Ledger

**Account**:
A named place in the ledger where value sits or comes from, such as a bank account, an expense category, or an equity account.
_Avoid_: Wallet

**Leaf Account**:
An Account that no other Account names as its parent. Postings land on it, and a report lists it: zeros and archived Accounts included.
_Avoid_: Posting account, detail account

**Header Account**:
An Account that groups other Accounts of its own type and takes no Postings, so it never appears as a report row and its Balance cannot be double counted.
_Avoid_: Parent account, group account

**Transaction**:
One balanced, immutable record of money moving, made of two or more postings that sum to zero.
_Avoid_: Entry, payment

**External reference**:
The stable key on a Transaction that makes a write idempotent: replaying it with identical content is a duplicate, with different content a conflict. It is unique in the personal entity. The `tx add` flag also calls it an idempotency key.
_Avoid_: Ref

**Balance**:
The amount one account holds at an as-of date, signed the way the ledger signs it: debit positive, credit negative, so a liability is normally negative.
_Avoid_: Amount, total, net

**Net worth**:
Assets minus liabilities at an As-of. Liability Balances stay raw and negative, so net worth is their plain sum. Equity, income and expense are not part of it.
_Avoid_: Equity, total wealth

**Trial balance**:
Every Leaf Account's Balance at an As-of, split into debit and credit columns whose totals agree.
_Avoid_: Worksheet

**Posting**:
A single signed amount against one account, carrying its currency and optional dimensions.
_Avoid_: Line, leg, split (a CSV row's `line` is a file position, not a Posting)

**Correction**:
The umbrella over the two linked rows: a void's reversal and an amend's replacement.
_Avoid_: Edit, fix

**Void**:
The act of cancelling an earlier transaction by writing a reversal. Nothing in the ledger is ever deleted.
_Avoid_: Delete, cancel, remove

**Reversal**:
The transaction a void writes: the original's postings with every sign flipped, linked to it.
_Avoid_: Void, delete, cancel

**Amend**:
A reversal of an earlier transaction plus a linked replacement.
_Avoid_: Edit, update

**Replacement**:
The transaction an amend adds beside its reversal: the corrected version, linked to the original.
_Avoid_: Edit, update, fix

**Opening balance**:
The transaction that states an account's value at the start of the record, posted against an equity account. It is written, never derived.
_Avoid_: Starting balance, initial amount

**Archive**:
The state that `account close` produces: the account stops accepting postings and stays in history, reports and exports. Closing never deletes.
_Avoid_: Delete, remove

**Dimension**:
A tag on a posting that slices reports without changing any balance.
_Avoid_: Tag, label

**Project**:
A dimension that groups the postings of a side venture so it can be reported like a small business.
_Avoid_: Business

**Entity**:
A legally separate party whose books balance on their own. Only the personal entity exists today.
_Avoid_: Company, tenant

**Personal entity**:
The one seeded entity that owns every account and scenario today. It is addressed by a fixed id, never by the core's `"default"` fallback.
_Avoid_: Default entity, main entity

### Scenario

**Stream**:
A recurring flow of money in a scenario, either earned (stops when earning stops) or passive (continues). `sim-core`'s Scenario calls the same thing a `flow`, and the CLI's document paths address them as `flows.<id>...`.
_Avoid_: Income source

**Event**:
A dated one-off change in a scenario, such as a purchase or a windfall.
_Avoid_: Milestone

**Fork**:
A copy of a Scenario under a new name that remembers the id of the Scenario it came from.
_Avoid_: Branch, clone

**Override**:
A value that replaces one dotted path of a Scenario's document; persisted when a fork is made, or applied transiently to a Projection.
_Avoid_: Patch, edit

**Removal**:
A list item taken out of a Scenario's document by its `id`, with `--without`, before any Override is applied. It names an item, never a value, so `--set` cannot stand in for it; a Projection applies it transiently and `scenario fork` persists it.
_Avoid_: Delete, drop, exclude

**Addition**:
A new list item put on a Scenario's `accounts`, `flows` or `milestones` with `--add <list>=<json>`, after the Removals and before the Sets. It carries its own `id`, which must not already exist and must not be one the same call's `--without` took out, so it never replaces anything (`--set` changes an item); a Projection applies it transiently and `scenario fork` and `scenario apply` persist it (ADR-0062).
_Avoid_: Insert, create

**What-if**:
A set of Overrides, Removals and Additions applied to one stored Scenario. A Projection applies it transiently, `scenario fork` saves it as a new plan, and `scenario apply <name> --set/--without/--add` saves it to the plan it came from (ADR-0057, ADR-0062).
_Avoid_: Draft, patch, edit

**Contribution**:
Money moved from cash flow into an investment or retirement account. It is not an expense, so net worth does not change at that instant.
_Avoid_: Investment expense, savings

**Household**:
The people a Scenario's plan belongs to, stored beside its document: one holder, at most one partner and any dependents, each with a birth month and a life expectancy. It never changes the document's own fields; its Anchors do (ADR-0048).
_Avoid_: Profile, family

**Anchor**:
A household's pin of one Scenario date field to a person's age, to their life's end or to a partner's join month. The date is written into the Scenario when the household is set; a later apply or fork keeps it, fills it, or refuses a value that disagrees (ADR-0048).
_Avoid_: Link, binding, age field

**Template**:
The Scenario document `scenario apply --template` prints to edit and then apply with `--file`. Alone it is a minimal document; with an As-of it declares every asset and liability Account of the Ledger at that date, pre-filled from the Baseline, and it writes nothing (ADR-0044).
_Avoid_: Sample, skeleton, example

### Chance

**Chance of success**:
The share of seeded Market paths on which a Scenario never runs out before its Horizon. It is a share of the paths a Return model produced, so it is only as meaningful as that model.
_Avoid_: Probability, success rate, confidence

**Return model**:
The weighted table of monthly returns, one per Account, that Market paths draw from. The CLI ships none; a caller states one in a JSON file with `--return-model`.
_Avoid_: Market history, returns table, assumptions

**Market path**:
One seeded run of a Return model's monthly draws over a Timeline. Paths differ only by their index, so the same seed and model always give the same set.
_Avoid_: Simulation, run, scenario path

**Band**:
The net-worth Percentiles across Market paths at one annual roll-up end, at the 10th, 25th, 50th, 75th and 90th levels. Every Band value is one a path produced.
_Avoid_: Range, interval, confidence band

**Decimal form**:
The Scenario document with each money field written as a decimal string of the Currency's major unit, such as `"350.00"`, as `scenario show --decimal` prints it and `scenario apply --decimal` reads it. The stored document is always minor units, so the two forms have one hash (ADR-0047).
_Avoid_: Float form, human form, display form

### Financial independence

**FI**:
Financial independence: the point from which the portfolio and passive streams can fund the planned life without earned income.
_Avoid_: FIRE

**Survival**:
The FI method that finds the earliest month at which, if earned income stopped, the projection never runs out of money before the horizon date.
_Avoid_: Safe withdrawal, 25× rule

**Horizon**:
The date at which a projection ends, given by `--horizon`. An age is derived from it only when a birth date is also given.
_Avoid_: End date, lifespan

### Tax

**Tax Levy**:
The scenario's own rule set for one jurisdiction's income tax: its period, its settlement date and the graph of measures that owes the tax. A result reports tax as applied only when the scenario holds this Levy.
_Avoid_: Tax rate, tax setting, tax flag

**Tax status**:
Whether a result's figures include income tax: `applied`, `not_applied`, or `mixed` for a compare whose two sides disagree.
_Avoid_: Taxed, pre-tax, after-tax (as a status)

**Carry-in**:
What a Levy's period had already tallied before the as-of, and what had already been prepaid. It is a property of the projection, not of the scenario, because the same scenario projected from two dates needs two answers. The caller states it with `--carry-in`, one record per Levy and period, and the result echoes it with the source it came from: `flag`, `document` or `scope`.
_Avoid_: Opening balance, prior year

**Tax label**:
The Section 40 income class, or the retirement allowance, an income or contribution Flow is tallied under. A Flow with no label is not tax-free income; it is income no Levy is told about.
_Avoid_: Category, tag, tax code

**Tax year**:
One period of a Tax Levy and its Settlement: what it owed, what was prepaid, and what settles. A result reports one row per Tax year, a year that began before the As-of included.
_Avoid_: Tax period, fiscal year, assessment year

**Prepayment**:
Money already taken at source against a Tax year, such as payroll withholding. It reduces what the year owes at its Settlement but is not an expense.
_Avoid_: Withholding tax, advance payment

**Tax owed**:
The amount a Tax year settles: its due less its Prepayment. A negative figure is a refund.
_Avoid_: Tax bill, balance due, refund amount

**Stated allowance**:
A deduction class the flags of a tax write named, such as life insurance or home-loan interest. `scenario tax` reports the classes it stated and the ones it left out, so a deduction nobody named is visible instead of read as zero; what the Levy then allows is tax-core's rule, not the CLI's.
_Avoid_: Modelled allowance, applied allowance, tax relief

**Tax assumption**:
A tax figure a result used whose source is not yet confirmed, named in the result's `assumptions` until it is sourced: `reported` when only a secondary source states it, `unsourced` when none was read. The tax core owns the list and the Levy's tallies decide which tax years used which figure; the CLI states them and holds no figure of its own (ADR-0042).
_Avoid_: Warning, disclaimer, estimate

### Packages

**Core**:
A separate, pure package of real-world logic (ledger, simulation, or tax) that knows nothing about this application.
_Avoid_: Library, plugin

**Simulation core**:
The core that projects the future from a baseline and a scenario. Package `@trajectonomics/sim`, monorepo path `packages/core/sim`.
_Avoid_: Sim, simulator

**Tax core**:
The core that computes statutory income tax for a jurisdiction and emits it as a Levy the simulation core charges. Package `@trajectonomics/tax`, monorepo path `packages/core/tax`.
_Avoid_: Tax engine, tax calculator

### Contract

**Exit code**:
The coarse class of a finished run: 0 ok, 1 unexpected, 2 invalid input, 3 domain rejection, 4 not found, 5 conflict.
_Avoid_: Status, return code

**Error code**:
The stable string name of one failure, belonging to exactly one exit code. Many error codes share one exit code; one error code never spans two. A code also says whether the same command may be retried (`retryable`), because one exit class holds both retryable and permanent failures (ADR-0037).
_Avoid_: Error id, reason, cause

**Command**:
One runnable entry of the CLI, such as `tx add`, reached by a path of words. It validates its input, returns a Result and never formats or exits.
_Avoid_: Subcommand, action, verb

**Group**:
A command path prefix, such as `tx`, that only holds commands, so a bare group names no command and is invalid input at exit 2.
_Avoid_: Namespace, category

**Flag**:
A named option of a command, derived from a field of its input schema that is not a positional.
_Avoid_: Option, switch

**Input path**:
The failure envelope's `path`, naming the caller's own input: a flag (`--as-of`), a positional's declared name (`file`), or a dotted path inside a JSON document (`document.postings.0.amount`). It is never a schema field name.
_Avoid_: Field path, JSON path

**Format**:
How a command renders its result, `human` or `json`, chosen explicitly by flag or environment and never inferred from a terminal.
_Avoid_: Mode, output type

**Export format**:
The file format of an export: `jsonl`, `csv` or `md`, chosen by `--format`. It is not **Format**, which is `human` or `json`; the two are separate axes and `--format` never changes the result's envelope.
_Avoid_: Output format, mode

**Dump**:
Every stored row of every table, tombstones included, in the canonical order the export writes: entity, account, tx, posting, scenario. One read produces it, so `inspect` and every export format show the same rows.
_Avoid_: Snapshot, backup

**Result**:
What a command returns when it succeeds, shaped by that command's output schema.
_Avoid_: Output, response, payload

**Echo**:
The block every result carries stating what it was computed from: the as-of, the engine and its version, the scenario with its hashes, the applied overrides, the tax status, the Carry-in it placed, and the sentences a person must read before the figures.
_Avoid_: Metadata, header, provenance block

**Hint**:
The one sentence naming the command to run next. A failure carries it in the error envelope's `hint` (ADR-0013); a Result that has nothing to show carries it in its own `hint` field (ADR-0040). It is prose, and both places print it as a `hint:` line.
_Avoid_: Next step, suggestion, tip

**Data directory**:
The single directory holding all state, `~/.traj` unless `TRAJ_HOME` says otherwise.
_Avoid_: Home, config dir, state dir

**Import template**:
The one CSV header `date,from,to,amount,memo,external_ref,project` that `tx import` reads. It is not a bank export and not the canonical JSONL restore.
_Avoid_: Format, schema, bank export

### Data

**Backup**:
A directory holding `traj.jsonl`, the canonical JSONL Dump, written by `traj backup` and read by `traj restore`. Two backups of the same database are byte-identical, so a backup is compared by its bytes and never by a timestamp.
_Avoid_: Snapshot, Copy (a Backup is the directory that holds a Dump; the Dump is the rows)

**Restore**:
Writing a Backup's rows into an empty database, verbatim. It never merges and never overwrites.
_Avoid_: Import (an Import writes new Ledger facts through the write path), load, sync

**Pre-migration copy**:
The file `traj.db.pre-v<N>.bak` beside the database, a plain SQLite copy written before an upgrade migrated a database that held schema version `N`. There is one per version, and the newest replaces the older. An older `traj` can open it; nothing in the current `traj` reads it, and it is not a Backup (cli ADR-0050).
_Avoid_: Backup (a Backup is the JSONL Dump a restore reads), snapshot, rollback file

**Stored data**:
The database file in the Data directory, and nothing else there. `traj data remove` deletes it; the launcher's `bin/` cache and anything else in the directory stay.
_Avoid_: Home, state, everything under `~/.traj`

**Doctor**:
The health check over the Data directory, the database and the Ledger. It reports and writes no row, and its `ok` is false when a check found a problem.
_Avoid_: Verify, repair, fix (a Doctor never changes what it reports on)

### Release

**Release**:
One tag `vX.Y.Z` and the artifacts attached to it: the binary for each supported platform, their checksums, and the install scripts.
_Avoid_: build, artifact, deploy

**Install channel**:
A way a user obtains the `traj` binary: a GitHub Release, the npm package, or the install script. Homebrew would be a fourth.
_Avoid_: distribution method, delivery

**Release marker**:
A line in a document or a help page naming the release that ships what the text describes, so a reader of an older release is not sent to a command it cannot run (ADR-0034).
_Avoid_: version note, TODO, roadmap marker

### Usage

**Usage count**:
The anonymous event one finished run of `traj` sends, unless it is turned off: the command name, exit code, format, version and OS, keyed by a random id a person can delete (ADR-0045). It never holds the Ledger, arguments or paths.
_Avoid_: tracking, analytics, telemetry data

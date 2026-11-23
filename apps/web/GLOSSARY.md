# Dashboard

A read-only web app, in this repository, that shows what `traj` already computed. It runs from a checkout on `127.0.0.1` and reads one Snapshot file.

## Language

**Dashboard**:
The static web app in `apps/web`: Svelte 5 pages and components that render one Snapshot and compute no figure of their own.
_Avoid_: backend, API, sync, server

**Snapshot**:
One JSON document, version 1, that holds every Read the Dashboard needs, each with the argv that produced it. It is the closed contract between `traj` and the Dashboard.
_Avoid_: backend, API, sync, server, payload, cache

**Read**:
One `traj … --json` call, kept verbatim in a Snapshot: its argv and either its parsed data or its error envelope.
_Avoid_: fetch, request, query, call

**Demo snapshot**:
The committed Snapshot in `public/demo/snapshot.json`, built from a fictional ledger, so the Dashboard can be seen with no ledger of anyone's own.
_Avoid_: sample data, mock, fixture, seed data

**Pack**:
The built pages of `dist/` in one file, `pack/dashboard.bin`: every file's bytes in base64 by its path, in one JSON document. The compiled `traj` embeds it so `traj dashboard` can serve the Dashboard without a checkout.
_Avoid_: bundle, archive, assets

**Plan**:
The list of argv a Snapshot needs, computed from the parameters alone. Stage one reads the Scenarios, the accounts and the first transaction date; stage two reads everything else.
_Avoid_: pipeline, workflow, job, script

**Edit**:
A write the page asks the server to run: one of a closed list (`src/lib/edit/edit.ts`) of `traj` scenario commands, copy a plan, apply a Scenario document or delete a plan. The server runs it dry, then for real, then re-reads the Snapshot, and answers with the new Snapshot or the CLI's error envelope.
_Avoid_: save, mutation, update, PATCH, request, write

**Household**:
The people a Scenario's dates are pinned to: one account holder, at most one partner, and any dependents, each with a birth month and a life expectancy. Its anchors write a date into a Scenario item, so the Dashboard shows the age it is pinned to. The page computes no age.
_Avoid_: family, members, users, profile

**Anchor**:
One date of a Scenario item pinned to a person's age, life end or joining. The label reads "at me, age 60", and the date is the one the household wrote.
_Avoid_: link, rule, trigger

**Milestone**:
A named target in a Scenario that fires on a date, on another Milestone, or when a figure such as net worth passes a level (sim ADR 0012). The Dashboard shows the date `traj projection run` reports for each one, or that it is not reached; it never works one out.
_Avoid_: Goal, event, target date

**Cash flow**:
The lines and section totals of one Annual roll-up, as `projection run --breakdown` states them: where a year's money came from (income, withdrawals, money drawn) and where it went (tax, spending by category, saving per Flow, money left over), with any Shortfall as unmet.
_Avoid_: budget, ledger, transactions

**Flow diagram**:
The picture of one year's cash flow on the Cash flow page: sources on the left, the cash node, and uses on the right, with each band's height its amount's share of the taller column. Pure geometry from `src/lib/chart/flow.ts`; it adds no figure of its own.
_Avoid_: Sankey (as a name for the page), chart, graph

**What-if session**:
The changes one tab holds against one plan, switched items off (Removals) and values set (Sets), which `traj` applies transiently to read a figure and never writes until the person keeps or applies it. It is held in the tab only.
_Avoid_: scratch plan, draft, scenario copy, simulation

**Group** (in a What-if session):
A loan or a real asset changed as a whole: its parts (Account, Flows, debt) are switched off, tried and taken back together, and the session bar lists them as one change. A part never changes alone, because the plan would not agree with itself.
_Avoid_: bundle, batch

**What-if lens**:
The four reads of a What-if session's answer, parsed against the contract and bound to the session's plan: what a figure page may show of the session. A page with no lens shows the baseline alone.
_Avoid_: preview, overlay, diff

**Loan**:
A liability Account in a plan, with the level Contribution that repays it and, when the money arrives on a date, the withdrawal that borrows it. The page edits the three parts together; `traj` computes the payments and the statement.
_Avoid_: debt schedule, amortization, mortgage (as a kind)

**Report**:
A table of the selected plan's projection as `traj` stated it, which the Reports page previews and writes as a CSV or JSON file, or prints. A CSV cell is exactly the string the Snapshot holds, and an empty cell is a figure `traj` stated as null. A cell is never guarded against a spreadsheet formula: the data is the person's own ledger, and a guard would change what `traj` stated. The JSON is value-equal to the Snapshot's Read, not byte-identical, because the loader keeps the parsed result and not the file's text.
_Avoid_: export (as the name of the table), statement, extract

**Real asset**:
An asset Account that is not liquid (a home or a car), with the items that buy, finance, keep, rent out and sell it, written under one id convention. The page edits them together and groups them on one card; `traj` computes its value, its costs and its loan. An item that follows the convention's id but not its shape is an ordinary item.
_Avoid_: property, holding, fixed asset (as a kind)

**Addition**:
A new list item (a Flow, an Account or a Milestone) that a What-if session puts on the plan with its own id, which `traj` applies after the Removals and before the Sets (`--add`) and never writes until the person keeps or applies the session. The page sends the item as one argv token and lists it in the session with its own way to remove it.
_Avoid_: new item, insert, patch

**Allowance inputs**:
The labels in the person's order, the step and the two optional limits (a yearly budget, a least saving per step) that the `projection allowances` reads are made with. They are kept with the Snapshot's parameters and never in a Scenario, so changing them is a read and writes nothing.
_Avoid_: settings, preferences, options

**Suggestion**:
One Flow `traj projection allowances` states for a tax year and an allowance: a lump contribution of the extra that fits, with the Account it pays into, or a hint of why it has none. The page never makes one; it tries it as Additions or adds it to the plan.
_Avoid_: recommendation, advice, tip

**Spending rule**:
An expense Flow with a `rule` in place of an amount: a share of what the plan's savings are worth, kept level, or taken each year, or taken with limits that cut and raise. The rate, band, bound and rounding are the person's own estimate and `traj` ships none. The page writes it as one Flow and reads what it pays from `projection run --spending`; it computes no amount of one.
_Avoid_: withdrawal strategy, safe withdrawal rate, drawdown

**Rule year**:
Twelve monthly occurrences, or one annual one, of a spending rule, counted from the Flow's first landed date. `traj` states for each the savings the rule read, the amount it fixed, what was paid (nominal and in today's money), the share of the savings and what the rule did (none, floor, ceiling, cut, raise).
_Avoid_: fiscal year, spending year (as a calendar year)

**Spending Bands**:
The Percentiles across Market paths of what a spending rule pays in each roll-up, and of each path's lowest whole year, as `projection chance` states them. A path that ran out counts 0, and a part year is not a whole one.
_Avoid_: forecast, range of outcomes

**Estate**:
What the plan would leave on one date, as `projection run --estate` states it: the gross estate (everything owned), the debts, the settlement costs, the net estate, the gifts and what heirs receive, with each cost and gift line. Only the net estate and what heirs receive are also stated in today's money. Every cost and gift is the person's own, written in the plan's `estate` block; no tax is worked out, and an inheritance tax is a cost line the person types.
_Avoid_: inheritance, will, legacy, probate

**Estate date**:
The date the Estate page reads: the later life expectancy of the household's holder and partner by default, a Milestone, a household anchor or the plan's last year. The page reads the `estate` row on that date or the first roll-up end after it, and computes no date.
_Avoid_: death date, payout date

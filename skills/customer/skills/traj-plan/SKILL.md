---
name: traj-plan
description: "Answer planning questions with `traj`, the personal money command line: when someone can stop working, what a purchase or a raise would change, what their plan looks like at a horizon they name, and what their Thai income tax comes to for a tax year and what a deduction would change. Use when someone asks about financial independence, retiring early, a projection, a what-if, a savings plan, whether their money lasts, or Thai income tax."
metadata:
  cli: ">=0.3.0 <0.4.0"
---

# traj-plan

This is a Recipe: the policy of a planning conversation. Every command, flag, document field and unit
comes from the command line in front of you — `traj schema …` read as the `traj` Skill says — and
never from this file. When the schema does not publish something this Recipe needs, stop and say so
rather than approximating it.

The job: a person's own figures become a plan the tool computed, with its horizon and its
assumptions in plain sight, and with the things `traj` cannot do named instead of faked.

## Ask for the plan's facts, and never substitute one

Ask, and take no default:

- the **as-of**, the date the plan is read from;
- the **horizon**, the date the plan runs to;
- the **scenario** the plan runs under, by name, from `traj scenario list --json`;
- the facts behind that scenario — income, spending, contributions and withdrawals — as the person
  states them.

No date is read off the machine, and a missing as-of or horizon is a question, not a default. Never
substitute today for the as-of, and never stretch the horizon to reach a nicer answer.

## Read the tool's own document, never a remembered one

The Scenario is the tool's document. Start from what `traj scenario apply --template` prints, take
every field from the schema, and iterate on the tool's own errors: each names the path that is wrong,
and that error is the loop. Write the document to a file, dry-run it, then apply it under a name of
its own so the baseline stays untouched.

The plan's baseline is the person's ledger, so a balance the tool refuses as undeclared means the
Scenario does not carry that account yet: declare the account the ledger already has, rather than
renaming or dropping it.

## Step 1: the financial-independence date

Run `traj fi --as-of <as-of> --horizon <horizon> --scenario <scenario> --json`, and report:

- the FI date with **its horizon** and the assumptions it was computed under, taken from the
  Scenario's own document and the result's own notes;
- whether it is reachable at all: when the result says it is not reached within the horizon, say
  that, with the horizon, and do not extend the horizon silently to produce a date;
- the 25-times-annual-spending figure **only** as a labelled rule of thumb — the result itself
  labels that reference — and never as the FI date. The rule of thumb is not the projection's date,
  and the date does not carry it.

A figure without its horizon and assumptions is one the person will read as unconditional.

## Step 2: run the projection, and say when the plan runs out

Run `traj projection run --as-of <as-of> --horizon <horizon> --scenario <scenario> --json`, and
report plainly, each with the period it belongs to:

- any unfunded contribution — money the plan was supposed to add and could not;
- any run-out date — the point the money is gone before the horizon.

Say both before the year-by-year detail, and never round a shortfall away.

## Step 3: the what-if is the tool's own difference

A what-if is a second Scenario: fork or apply one, change only the field the person's sentence names,
and let `traj projection compare <a> <b> --as-of <as-of> --horizon <horizon> --json` report the
difference. The answer is that difference, never arithmetic of your own.

When the person's sentence names something the published schema has no field for, refuse it plainly:
say that this release of `traj` cannot express it, and leave the number missing. A what-if built on a
plan that already runs out of money or cannot fund its contributions is not presented as the plan:
say what the baseline does first, then the difference, in those words.

Turning their sentence into a document field is a reading of the schema, never an act of memory:
read the field from the schema, start from the release's template, and carry no field name with you.

## The Thai tax recipe: estimate a tax year, then show what a deduction changes

Use this branch when the person asks about their Thai income tax for a tax year, or what a deduction
would change it by. This release computes one jurisdiction, the 2026 income tax, which the schema
publishes as the only value of `--tax`: `th-2026`.

### Step T1: ask the facts, and never default one silently

Ask every one of these in one question, and take no default for any of them:

- the **as-of** and the **horizon**, as above. For tax year 2026 the horizon must reach `2026-12-31`
  to cover the whole year. Read each year's `partial` field, and say so when it is true.
- the **filing status**, one of the values `traj schema scenario tax` publishes for `--filing-status`.
  When the person does not know it, say the tool uses `single` when none is given, and record that as
  a default they did not choose.
- the **children**, and how many were born in 2018 or later, which is `--children-at-higher-rate` and
  is counted within `--children`;
- the **parents** aged 60 or over they support, and any **relative with a disability** they care for;
- the **deductions they already pay**, in THB, for each flag the schema publishes: `--social-security`,
  `--life-insurance`, `--health-insurance`, `--parent-health-insurance`, `--spouse-life-insurance`,
  `--mortgage-interest`, `--donation2x` and `--donation1x`. Zero is an answer: a deduction they do not
  pay is recorded as zero.
- the **class** of each income Flow in the Scenario, and the class of each retirement or ThaiESG
  contribution Flow. Read the classes from the `--label` flag's description in
  `traj schema scenario tax`, offer the person those classes, and use the one they choose. Never pick
  a class to make a command pass, and never carry one from memory.

A figure the person gave is stated as they gave it. A number they estimated is reported as "rough —
your estimate". A figure `traj` computed is never marked rough.

Done when every fact is answered, or its default is stated.

### Step T2: write the tax Levy, and say what it leaves out

Write the Levy to a Scenario of its own name, a fork of the baseline, so the baseline stays untouched.
Run `traj scenario tax <name> --tax th-2026` with the flags for the facts the person gave, and one
`--label <flow>=<label>` for each classified Flow. Dry-run it with `--dry-run` first, then write it.

The result's `allowances` lists what the flags stated, and what the figure leaves out. Report the
classes it leaves out, by the names the tool printed, as the figure's "not modelled" list.

Done when the Levy is written and its leftover classes are in hand.

### Step T3: the tax figure, with its years

Run `traj projection run --as-of <as-of> --horizon <horizon> --scenario <name> --json`. Report the
result's `tax` field, which says whether the Levy is applied, and each tax year in `taxYears`: its
`from` and `to` dates, `due`, `prepaid`, `owed`, its settlement date, and whether it is `settled` and
`partial`. Report tax year 2026 with the as-of, its dates, the words "estimate, not a filing", and
the statement that tax is in it.

`traj` does not file a return and does not use e-Filing. Filing is the person's own step; this figure
is for checking it, not for submitting it.

Done when the year's `owed` is reported with its dates and the disclosures.

### Step T4: what one deduction changes

There are two ways to show a deduction, one for each kind:

- **A deduction the `scenario tax` flags state.** Fork the baseline into a what-if of its own, write
  its Levy again with that one flag changed, and compare:
  `traj scenario fork <baseline> <what-if>`, then `traj scenario tax <what-if> --tax th-2026` with the
  same flags and that one change, then
  `traj projection compare <baseline> <what-if> --as-of <as-of> --horizon <horizon> --json`.
- **A retirement or ThaiESG contribution.** These are contribution Flows, classified in Step T1, and no
  flag states them. Keep one contribution Flow of that class in the baseline at amount zero, then
  compare with `--set`, which replaces that Flow's amount:
  `traj projection compare <name> --as-of <as-of> --horizon <horizon> --set flows.<id>.amount=<satang> --json`.
  `--set` replaces a path that exists and cannot add one, so when the Scenario has no such Flow, add
  it to the document first and then compare. Amounts are integer satang: 100 THB is 10000 satang.

Read the result. Its `deltas` carry net worth and financial-independence timing; they do not carry tax
owed. Report each side's `owed` figure for tax year 2026, from that side's `taxYears`, side by side, as
the tool printed them, and say that owed tax is the figure the deduction changes. Do not subtract the
two figures yourself. When the compare's `notes` name a contribution the tool could not fund, say that
the figure is not the deduction alone.

Answer "what would X baht of RMF or ThaiESG change", never "buy this". Never name, compare, rank or
recommend a fund or any investment product: recommending a specific fund in Thailand is regulated
investment advice, and this tool does not give it. When the person asks which fund to buy, say plainly
that you cannot, and answer only the change.

Done when both owed figures are reported with their as-of and the disclosures, or the unfunded
contribution is named.

## What every answer discloses

Every plan answer carries these, in plain words:

- **This is an estimate, not a filing.** In particular a tax figure from this tool is an estimate and
  nothing here is a tax return.
- **What is not modelled**, named for the question asked — the facts the Scenario does not carry, and
  for a tax figure the classes its Levy leaves out.
- **What `traj` cannot do in this release**: it does not file a return or use e-Filing, it cannot hold
  a currency other than THB (so no USD), and it has no Monte Carlo, no return shock, and no
  "retire at 55" — a sentence like that is refused, not approximated. Leave the missing number
  missing.
- **The as-of every figure was read at, and whether tax is in it.** A figure carries tax only when its
  Scenario carries a Levy; the result's `tax` field says whether it is applied.

## Never

- Never fill a gap with your own arithmetic, and never present an estimate as the tool's answer.
- Never report the 25-times figure as the FI date, and never report the FI date without its horizon.
- Never hide an unfunded contribution or a run-out behind a total that looks healthy.
- Never answer a what-if, a tax figure or a retirement age that the schema does not publish.
- Never choose a tax class for the person, and never name a tax label from memory.
- Never name, compare, rank or recommend a fund or an investment product, and never say "buy".

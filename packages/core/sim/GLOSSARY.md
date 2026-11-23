# Simulation Core Glossary

Domain vocabulary for `sim-core` (personal-finance projection engine).

**Design rule:** a primitive is defined by how the simulation treats it, not by its real-world name. Things that behave the same are the same primitive.

## Core Concepts

**Baseline**:
The opening snapshot: balances per account at the Timeline start, and the Cost basis of any Account that tracks gains. Nothing else. A balance is a Capitalised balance with zero Accrued interest, so feeding a row's `amount` back in folds Accrued interest into the capitalised balance early, feeding `capitalised` drops it, and only a row on a Compounding date resumes exactly.
_Avoid_: Initial state, starting ledger, opening balance

**Scenario**:
The complete, self-contained set of rules and plan applied to a Baseline: currency, economy, accounts, flows, cashflow routing, and optional Levies and a Calendar. Not a diff; callers build variants by editing a copy.
_Avoid_: What-if model, fork, experiment

**Timeline**:
The run parameters `{ start, horizon, resolution }`. `start` is the date the Baseline balances are measured at. `resolution` (`day` or `month`) only selects which rows the Projection reports; it never changes the numbers.
_Avoid_: Date list, time steps

**Calendar**:
The Scenario's optional rule for when money may move: a `dayRule` and an explicit list of Holidays. When it is absent, every Due date is a Landed date.
_Avoid_: Business calendar, holiday calendar, timezone

**Business day**:
A date that is not Saturday, Sunday, or a Holiday. A Landed date is a Business day, except at the lower edge of the supported years, where no earlier date exists.
_Avoid_: Working day, weekday, banking day

**Holiday**:
A date the Calendar lists as closed. Nothing lands and no Settlement falls on it.
_Avoid_: Public holiday, bank holiday, non-working day

**Due date**:
The date a Flow's recurrence or a Levy's settlement rule names, before the Calendar moves it. The Levy's `due` values are amounts, not dates.
_Avoid_: Scheduled date, planned date, effective date

**Landed date**:
The date money moves: the Occurrence date. A Flow's Due date moved forward to a Business day, and likewise a Settlement's.
_Avoid_: Value date, posting date, actual date

**Projection**:
The deterministic output of a Baseline, Scenario and Timeline: states and cashflows over the horizon. Each row's `balances` and `realBalances` list one **ProjectionBalance** per Account.
_Avoid_: Forecast, prediction, simulation run

**Occurrence**:
A date on which at least one Flow lands or a Settlement falls; its dates are Landed dates. Only Occurrences change balances; the Timeline's `start` and `horizon` are both inclusive.
_Avoid_: Tick, step, period

**Annual roll-up**:
Totals over one twelve-month period of a Projection, running from an anniversary of `start` to the day before the next one. The last period is cut short by the horizon or a Shortfall and marked partial.
_Avoid_: Year, fiscal year

**Levy**:
A closed rule set in the Scenario that charges an amount for each Settlement period from that period's Flows: a period rule, a settlement rule and a graph of Measures. A Scenario may hold several Levies, each with its own periods, Settlements and Carry-in; they share Tally labels but never read each other. The core does not know what a Levy represents; callers, or a rule-set emitter such as tax-core, author it as data.
_Avoid_: Tax, tax rules, formula callback, plugin

**Settlement period**:
A twelve-month period set by the Levy's period rule, over which the Levy tallies Flows before it settles. Usually a calendar year. A Settlement period and an Annual roll-up rarely cover the same days, and Levy results are reported per Settlement period with `settled` and `partial` flags.
_Avoid_: Tax year, fiscal year, year, Annual roll-up

**Measure**:
A named value inside a Levy, or inside a Derived amount, computed in integer minor units from tallies (Levy only), Flow amounts (Derived amount only), constants and other Measures. The Measures form an acyclic graph, and the Levy names the Measure that is due.
_Avoid_: Variable, formula, derived flow

**Dated constant**:
A `const` Measure whose value steps on given dates: a starting value and a list of `{ from, value }`. A Settlement period uses the last step on or before the period's last day, not its Settlement date. It cannot also grow by a rate.
_Avoid_: Time-varying parameter, schedule

**Derived amount**:
A Flow amount computed on each Occurrence from other Flows instead of fixed: a Measure graph over the planned gross amounts that other Flows land on the same Landed date (0 for a Flow that does not land then), before Prepayment and any cap. The Flows form an acyclic graph. A negative result or an overflow is reported, never clamped. A Derived amount that reads earned income falls to 0 once earned income stops in the FI test.
_Avoid_: Percentage flow, formula flow, linked flow

**Tally label**:
A label on an income Flow, on a contribution Flow, or on an asset Account (`returnLabel`, `gainLabel`), that a Levy sums over a Settlement period. A Flow or Account with no label is never tallied, which is how a tax-sheltered Account is left out. Gross tallies use the planned income amount; funded tallies use the amount a contribution actually applied after any cap. A label is the unit of per-person scope: separate caps per earner are separate labels, and `add` sums their Measures. A Levy whose `due` graph reads tally labels and has none of them supplied anywhere in the Scenario is refused by `check()` (`UNSUPPLIED_TALLY_LABEL`), because every total it reads would be zero in every Settlement period.
_Avoid_: Category, tag, tax category

**Returns tally**:
The growth an Account with a `returnLabel` accrued inside a Settlement period, counted whether or not it was withdrawn. It is signed, and attributed from read-only valuations so it never changes a balance.
_Avoid_: Interest income, investment income

**Realised gain**:
The gain of a withdrawal from an Account with a `gainLabel`: the amount withdrawn minus the Cost basis it used up. It is signed and tallied in the Settlement period of the withdrawal's Landed date.
_Avoid_: Capital gain, profit

**Cost basis**:
The pooled amount put into an Account (average cost): applied Contributions and surplus fills add to it, growth does not, and a withdrawal uses up a proportional share. The opening value is given in the Baseline.
_Avoid_: Purchase price, lot

**Prepayment**:
An amount taken at source from an income Flow, as a share in basis points of each Occurrence's gross amount, rounded half up in minor units. A Flow names the Levy each share is credited to; the shares sum to at most 10000 basis points and are rounded cumulatively in Scenario Levy order, so together they never exceed the gross. Only the net lands in cash. A Levy's period total is credited against it at Settlement. An income Flow may also carry a `cappedPrepayment` share, taken only from the part of each Occurrence below a cap on the label's period-to-date gross (Carry-in included); the cap is a Levy `const`, so a wage base stops being prepaid once it is reached.
_Avoid_: Withholding, prepaid tax

**Settlement**:
The one date after a Settlement period ends on which the Levy's due amount is reconciled against Prepayment. A balance due is paid like an expense and a refund lands like income. The date is the settlement rule's date moved forward to the next Business day, so a Settlement always falls after the period it closes. Settlements of several Levies on one Landed date are summed into one movement. A period the Projection ends before is still reported, with `settled: false`, and nothing is deducted.
_Avoid_: Tax settlement, filing, payment

**Carry-in**:
The tallies and Prepayment already recorded for a Settlement period that began before `start`, supplied by the caller because the Baseline holds balances only. It covers the period containing `start` and any earlier period whose Settlement falls after `start`, and it covers money that landed before `start`, not money that was due before it.
_Avoid_: Year-to-date, opening income

**Account**:
A named balance with an explicit rule in the Scenario: `kind` (`asset` or `liability`), rate in basis points, optional `lockedUntil`, and optional `liquid`, where `liquid: false` marks an **Illiquid asset**. Every account with a balance must have a rule. A liability's balance is the positive amount owed. Without `compounding`, `rate` is an **effective annual rate**: one year grows the balance by exactly the rate, whatever the compounding period, unless a Return series covers those dates. With `compounding`, `rate` is a **nominal annual rate** and the Account also carries the split of **Capitalised balance** and **Accrued interest**. A Return series replaces the rate for the dates it covers; the rate stays required and validated.
_Avoid_: Wallet, holding

**Illiquid asset**:
An asset Account marked `liquid: false`, such as a home or a car. It is in Net worth and `allAssets`, and left out of Accessible net worth, `unlockedAssets`, the Minimum buffer, the rule-of-thumb numerator on the unlocked and accessible bases, and the accessible Metrics. No `withdraw` or `surplus` step may name it, though a contribution may fund it. It is never sold by the simulation: a sale is a later primitive. Absent or `liquid: true` means liquid, and `liquid` on a liability is refused.
_Avoid_: Real asset (the word `real` already means inflation-adjusted money), locked asset (a locked asset only waits for `lockedUntil`)

**Nominal annual rate**:
A rate stated by a contract or a law together with a **Compounding period**, such as "7% nominal, compounded monthly". It is not an effective annual rate: a full period earns exactly `rate / periodsPerYear`, and a year earns more when the interest is capitalised more often. An Account's `rate` is nominal exactly when it carries `compounding`; absent, the rate is effective annual.
_Avoid_: APR (a different convention), monthly rate

**Compounding period**:
The calendar period (`monthly`, `quarterly`, `semiannual` or `annual`) at whose end a nominal Account's **Accrued interest** is **Capitalised**. Periods are calendar-aligned — a calendar month, quarter, half-year or year — and never depend on `Timeline.start`, a Flow's date or an Account id.
_Avoid_: Period, interval, frequency

**Compounding date**:
The last day of a **Compounding period**: the date on which its Accrued interest is Capitalised. A Flow that lands on a compounding date sees that period's interest already capitalised and belongs to the next period.
_Avoid_: Payment date, period end

**Capitalisation**:
The moment a nominal Account's **Accrued interest** is added to its **Capitalised balance** and starts earning interest itself. It happens once per Account per **Compounding date**, and early only when a debit would take the Capitalised balance below zero (a settlement, so the Account can be paid off).
_Avoid_: Compounding, reinvestment, posting

**Capitalised balance**:
The part of a nominal Account's value that has been capitalised, or of an effective Account's value, which is all of it. It is the balance that earns interest; a Flow changes it from the Flow's date.
_Avoid_: Principal, base balance, locked balance

**Accrued interest**:
A nominal Account's interest earned in the current **Compounding period** and not yet **Capitalised**. It is part of the Account's reported value and Net worth, but it does not itself earn interest until capitalisation. A row on a Compounding date, and the opening row, report zero. Effective-annual Accounts always report zero.
_Avoid_: Unpaid interest, pending interest

**ProjectionBalance**:
One Account's value in a Projection row, split into `amount`, `capitalised` and `accruedInterest`, with `capitalised + accruedInterest = amount`. Effective-annual Accounts report `capitalised = amount` and `accruedInterest = 0`.
_Avoid_: Balance entry, row amount

**Flow**:
A dated cash movement of kind `income`, `expense`, `contribution` or `withdrawal`, with a frequency (including `once`), a start, an optional end, and growth. It may gate on a Milestone with `startAt` and `endAt`. Replaces the former Stream and Event.
_Avoid_: Stream, Event, Transaction, Recurring transaction, Schedule

**Contribution**:
A Flow that moves money from cashflow into an Account. Not an expense: net worth is unchanged at that instant. Into a liability account it is a debt payment and an obligation, and a `level` amount into a nominal liability pays its Level payment. Into an asset account it is a target: it is limited to the Available cashflow on that Occurrence and is never funded from existing assets. Same-date amounts are summed per Account, and `cashflow.contribute` sets the funding priority.

**Available cashflow**:
The income on one Occurrence minus its expenses and debt payments actually made, floored at zero. Cash from a Planned withdrawal is left out: it pays what it was raised for and the rest lands in surplus, so borrowing never looks like saving. Other dates are ignored; this is the ceiling for asset contributions. Because the cap is per Occurrence, money saved on one date can still be spent by an expense on another and leave a Shortfall then.
_Avoid_: Free cashflow, disposable income

**Unfunded contribution**:
The part of an asset contribution's planned amount, after same-date summing per Account, that Available cashflow could not cover. It is dropped, not carried over, and a zero grant never touches the account. Debt planned above the amount owed is not unfunded.
_Avoid_: Missed contribution

**Planned withdrawal**:
A Flow of kind `withdrawal` that borrows from a liability `source`: on each Landed date the amount owed grows by the amount and the same cash lands in cashflow, so net worth is unchanged that day. It is not income, is never tallied and does not stop in the FI test. Its source must be a liability; assets are a later slice.
_Avoid_: draw, sale, transfer

**Level payment**:
The one payment a `level` Contribution makes into a nominal liability: the amount that repays a principal over a number of equal payments at the Account's nominal rate, computed once from principal, rate and term and rounded once as the caller states. It does not grow.
_Avoid_: annuity payment, PMT, fixed payment, installment

**Liability statement**:
One liability's monthly record, reported as `Projection.liabilities` only when `project` is given `liabilityStatements: true`. Each calendar month, cut by the Timeline start, the horizon or a run-out date, gives the amount owed at its start (Accrued interest included), the Planned withdrawals that borrowed from it, the debt payments applied after the cap, its interest and the amount owed at its end. The interest is the residual, so `opening + drawn + interest − paid = closing` holds exactly.
_Avoid_: amortization table, loan schedule, payment schedule

**Paid-off date**:
The first Landed date on which a liability's amount owed reaches zero after being above zero, reported as `paidOff` on its Liability statement. It is absent while the amount owed is never zero, such as a loan still owed at the horizon.
_Avoid_: payoff date, maturity date, final payment date

**Earned income**:
Income from work, marked `earned: true`. It is the only income that stops in the FI test.
_Avoid_: Active income, salary income

**Passive income**:
Income marked `earned: false`. It continues when earned income stops.
_Avoid_: Investment income, unearned income

**Expense category**:
An optional free-text label on an expense Flow, 1 to 64 characters with no control characters, for grouping spending in reports. It is inert: the engine never reads it, so no Projection, FI answer or chance result changes with it.
_Avoid_: tag, label, Tally label

**Cash-flow breakdown**:
One Annual roll-up's report of where its money came from and went, reported as `Projection.cashflow` only when `project` is given `cashflowBreakdown: true`. It lists planned income by Flow, Prepayment and Settlement by Levy, expenses by Flow and by category, contributions by Flow and Account with the unfunded part, planned withdrawals, what `withdraw` drew and what `surplus` filled, and the unmet amount. Money in equals money out exactly, and every total equals its roll-up field.
_Avoid_: Sankey, statement, budget

**Cashflow**:
The routing rules for net money each time flows land: ordered `surplus` steps (account, optional fixed `upTo`), an ordered `contribute` list of asset accounts (funding priority), and an ordered `withdraw` list.
_Avoid_: Income/expense delta

**Shortfall**:
Money owed on an Occurrence that no unlocked Account in the `withdraw` list can supply. Expenses and debt payments are never refused; asset contributions are capped before this point. A debt payment can cause one; an asset contribution cannot. The Projection ends on that date.
_Avoid_: Overdraft, deficit

**Runs-out date**:
The date of the first Shortfall, recorded with the unmet amount. Absent when money lasts to the horizon.
_Avoid_: Depletion date, bankruptcy

**Net worth / Accessible net worth**:
Net worth is every Account's value with liabilities subtracted, including locked and Illiquid assets. Accessible net worth does the same but leaves out assets before their `lockedUntil` and every Illiquid asset; it is not the same as the subset the `withdraw` list can draw on.
_Avoid_: Liquid assets, spendable

**Financial Independence (FI)**:
The earliest month in which earned income can stop and the Projection has no Shortfall through the horizon. The FI method fixes the exact test and any extra condition, such as a minimum buffer.
_Avoid_: Retirement, target date

**Financial Independence month**:
The first day of the earliest month at which the FI test passes. It is a date; age is a caller concern.
_Avoid_: FI date, retirement date

**Retirement spending**:
The monthly spending that replaces planned expenses from the FI month onward when the FI method is given an override.
_Avoid_: Post-retirement expenses, withdrawal rate

**Minimum buffer**:
The number of months of expenses the FI method requires as accessible net worth. An Illiquid asset does not count toward it.
_Avoid_: Emergency fund, cash reserve

**Rule-of-thumb reference**:
An informational multiple of annual expenses (25 by default) reported beside a reachable FI month. The caller may set the multiplier, which balances count, which twelve months of expenses it divides by, and nominal or real money. It never decides the FI answer.
_Avoid_: FI threshold, target net worth, 25× reference

## Milestones

**Milestone**:
A named point in the plan. Its Criteria are combined with `all` or `any`, and it fires on the first evaluation date (or, for a Static milestone, the date) its Criteria hold; it stays fired. A Flow gates on it with `startAt` (lands on or after the fire date) or `endAt` (lands strictly before it).
_Avoid_: Event, trigger, goal, checkpoint

**Criterion**:
One condition of a Milestone: a `date`, an offset in months from another Milestone's fire date, a Metric compared with an amount, or a Metric compared with a multiple of another Metric.
_Avoid_: Condition, rule, predicate

**Metric**:
A money figure read from the plan on a date: a named balance (net worth, accessible net worth, all assets, unlocked assets, liabilities), the sum of named Accounts, or an expense window (next or trailing twelve months). Read before that date's Flows land.
_Avoid_: KPI, indicator, Measure

**Fire date**:
The date a Milestone fires. It is a Landed date: for a Static milestone it is known before the run; for a Dynamic milestone it is the evaluation date on which it first fires.
_Avoid_: Trigger date, hit date, achieved date

**Static milestone**:
A Milestone whose Criteria name only dates and other Static milestones, so its Fire date is known before the run. It may fall before `Timeline.start`.
_Avoid_: Fixed milestone, scheduled milestone

**Dynamic milestone**:
A Milestone with a Metric Criterion, or one that names a Dynamic milestone. It fires only on an Evaluation date.
_Avoid_: Conditional milestone, live milestone

**Evaluation date**:
A date on which a Flow's recurrence lands or a Settlement falls, and so the only dates a Dynamic milestone can fire on. Observation rows are never evaluation dates, so `resolution` changes no fire date.
_Avoid_: Tick, check date, observation date

## Market Paths and Stochastic Runs

**Span return**:
The return in basis points over one Return row's counted days. Not an annual rate: a +2% month is a span return of 200 bps, not an effective annual rate of 200 bps.
_Avoid_: Period return, monthly rate, sampled rate

**Return row**:
One dated span return for one Account. Its window runs from its `from` to the next row's `from`, the last row to the Timeline's `horizon`, and its day count is fixed at run start.
_Avoid_: Period, month row

**Return series**:
The Return rows for one Account, ascending and contiguous over a Timeline. While it applies it replaces the Account's rate.
_Avoid_: Rate override, return stream

**Return model**:
A joint bucket table of month span returns, one entry per Account in the model. It carries no fitted distribution: lognormal, historical bootstrap and a hand-written table all arrive as bucket tables.
_Avoid_: Distribution, market model

**Market bucket**:
One month's span returns for every Account in a Return model, with an integer weight; the weights sum to exactly 2^32, which is what makes the draw unbiased without rejection.
_Avoid_: Sample, scenario

**Market path**:
One complete set of Return series covering a Timeline: one draw of a Return model. It is not a Scenario.
_Avoid_: Scenario, simulation, run

**Seed**:
Exactly 16 lower-case hex digits that fix every Market path in a run, echoed verbatim in the result.
_Avoid_: Random seed, salt

**Outcome distribution**:
The output of a stochastic run over N Market paths: an Annual roll-up grid with Percentiles, a Runs-out histogram and a Success probability. It is not a Projection, which is the deterministic output.
_Avoid_: Stochastic projection, simulation run, forecast

**Percentile**:
The nearest-rank value at a level in 1..99 across a roll-up's sample, so it is always a value some Market path produced. There is no interpolation.
_Avoid_: Quantile, interpolated percentile

**Success probability**:
The share of Market paths with no Shortfall through the horizon, in basis points. It does not include the minimum buffer.
_Avoid_: Confidence, pass rate

**FI survival share**:
The share of Market paths that pass the FI test and also meet the minimum buffer at the dates the FI method checks. Stricter than Success probability, and never the same field.
_Avoid_: Success probability, confidence

**Probability threshold**:
The FI survival share a probability-threshold FI method requires, in basis points from 1 to 10000.
_Avoid_: Confidence level, target

**Chance of success**:
The result of `chanceOfSuccess`: the Success probability of one plan over seeded Market paths, with its Bands and its Runs-out counts by Annual roll-up period. It is an Outcome distribution for one plan, not a Projection.
_Avoid_: Confidence, forecast, simulation result

**Band**:
The net-worth Percentiles across Market paths at one Annual roll-up end, at levels 10, 25, 50, 75 and 90. A failed path contributes the net worth it died with.
_Avoid_: Range, confidence interval, corridor

## Input Conventions

- All dates are `YYYY-MM-DD`, in years 0001-9998. There are no ages in the core; callers convert ages to dates.
- All money is integer minor units in one currency per Scenario; callers convert before calling.
- All rates are integer basis points.
- Collections are arrays of objects with unique `id`s, never objects keyed by id.
- Inputs are checked by a hand-written `check()` returning `{ code, path }[]`; unknown keys are rejected.

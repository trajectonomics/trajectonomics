# Routing: share steps, withdrawal floors and targets that keep their value

Status: accepted

People decide where leftover money goes in an order: keep an emergency fund topped up, put a share of
what is left into investments, keep the rest in savings. When money is short they protect the emergency
fund until everything else is used. `cashflow.surplus` filled Accounts in order up to a fixed `upTo`,
and `withdraw` drew Accounts in order. Neither could split what is left by a share, keep a floor in an
Account while others were drawn first, or keep a target level in real terms over thirty years. This ADR
adds all three. The Scenario stays `schemaVersion: 4`: every new key is optional, and a Scenario that
does not use one runs byte for byte as before (the parity hashes of every existing case are unchanged).

## Decision

- **A share step.** A surplus step may carry `share`, a safe integer of basis points from 1 to 10000
  (`RATE_OUT_OF_RANGE`). With `left` the money still unrouted when the step is reached (the day's
  surplus less what the steps before it filled), it would take `floor(left × share / 10000)` and, with
  an `upTo`, no more than the room that target leaves in the Account. Whatever it does not take moves
  to the next step, which reads the smaller `left`. The division is BigInt and floors, never rounds up,
  so the Account never gets a unit the day did not have: 30% of 1,000,001 is `floor(300,000.3)` =
  300,000. Without `share` a step takes everything it can, as before.
- **The last step takes everything.** A step with `share` cannot be last (`SURPLUS_SHARE_LAST`, at its
  `share`), as a last step with `upTo` is `SURPLUS_UNROUTED`; with both keys the last step is refused for
  both. The money the steps do not take would otherwise have nowhere to go.
- **A withdrawal floor.** A `withdraw` entry is an Account id, or `{ account, downTo }`. An entry draws
  `min(still unmet, value − downTo)` when the value is above `downTo`, nothing otherwise, then the
  draw moves on. A locked Account is skipped whatever its floor, as before. When every entry has been
  tried and money is still unmet, that is a Shortfall: the floor holds, so the Account is never taken
  below `downTo` to meet it, and the Projection ends on that date with the unmet amount.
- **The same Account again.** Entries are tried in list order and each reads the Account's value then,
  so "savings to 300,000, then the funds, then the rest of savings" is
  `[{ account: "savings", downTo: 300000 }, "funds", "savings"]`. A repeat must have a floor that is
  provably lower than the earlier entry's, since floors that do not fall would draw nothing:
  - A plain entry counts as floor 0, so it may follow any floor.
  - A floored entry after a plain entry of the same Account, or a floor that is the same as or higher
    than the earlier one, is `WITHDRAW_FLOOR_ORDER` at that entry's `downTo`.
  - Two floors are ordered only on the same growth (see below), by amount. A pair on different growth,
    or a number after `{ amount, growth }`, cannot be ordered on every date, so it is refused too.
  - Two plain entries of one Account stay `DUPLICATE_ID`, as before.
- **A floor changes the order, not what is accessible.** The Minimum buffer and the Financial
  Independence test read `withdraw` as the list of Accounts that can pay (`fi/undrawable.ts` reads each
  entry's `account`). An Account whose only entry has a floor still counts as drawable there. A floor that
  no later entry lowers keeps its money out of reach of the draw, so a plan whose FI scan reads the
  Account as accessible reaches FI on the walk's own figures: the scan and the brute-force walk run the
  same routing, and agree (`routing-fi.test.ts`: a fund of 50,000,000 with a floor of 10,000,000 moves the
  month from 2026-10-01 to 2027-08-01, and a later plain entry for the fund returns it to 2026-10-01).
- **Targets in today's money.** `upTo` and `downTo` take a number (nominal, as before) or `{ amount,
  growth }` with `growth` the Flow `Growth` (`"inflation"` or `{ bps }`). The target on a date is `amount`
  grown by the whole years from the Timeline start with the engine's one whole-year growth
  (`money/growth.ts`, half up), as a spending rule's floor is (ADR 0023): `growthYears(start, date)`
  anniversaries, `years × 365` counted days. Whole years, never a fraction: a floor of 300,000 at 3%
  inflation is 337,653 for the fifth year (4 anniversaries passed) and 347,782 from the fifth
  anniversary; an `upTo` of 1,000,000 is 1,159,274 then. The Timeline start is held on each Account's
  state (`AccountState.opened`) so the routing reads it without a new argument on every walk.
- **The target in force, stated.** `routedTargetAt(target, timelineStart, date, inflation)` is exported from
  the package root and is the engine's own figure: a number is itself, `{ amount, growth }` is the grown
  amount above, as a `number` of minor units (the engine's `routedAt` reads the same exact value as a
  BigInt). A caller never re-derives it, so the CLI and the Dashboard cannot drift from the engine.
  `Projection.routing` states it, present only when some `upTo` or `downTo` is `{ amount, growth }`:
  `{ surplus: { entry, upTo }[], withdraw: { entry, downTo }[] }`, one item per step or entry in list order,
  `entry` its position, the target `{ first, horizon }` or `null` for a step or entry without one. `first` is
  the target on the Timeline start, the first roll-up's first day; `horizon` is the target on the horizon
  date, whatever the run-out. A nominal target beside a grown one states itself on both. A figure past the
  safe integers is `VALUE_OVERFLOW` on the horizon date, as any other. A Scenario with no grown target has no
  `routing` key, so every parity hash but the two grown cases is unchanged; `routing-real-floor` and
  `routing-real-target` moved only by the key (`routing-hashes.test.ts` holds each hash on `main` and shows
  it back once the key is left out).
- **Breakdown.** The breakdown's `surplus` lists are as before. `drawn` has one line per entry that drew
  money, in list order. When the list declares any floor, a line carries `entry`, the entry's position in
  `withdraw`, so an Account that appears twice reports once per entry and the page can show "drawn to the
  floor" and "drawn below it" apart. A plain list has no `entry` and is byte for byte as before. Money
  in plus unmet still equals money out (ADR 0018): a share step only changes which Account a fill goes to.
- **Errors as data.** Each new key is checked in `check()` and a valid Scenario never throws: a target
  or share outside its range is the code of its scalar (`NEGATIVE_AMOUNT`, `NOT_SAFE_INTEGER`,
  `RATE_OUT_OF_RANGE`, `MISSING_KEY`, `INVALID_GROWTH`). A floored `withdraw` entry names its Account at
  `account`, so an Illiquid, unknown or liability Account is refused there (`ILLIQUID_ROUTED`,
  `UNKNOWN_ACCOUNT`, `LIABILITY_MISUSE`), and the obligation rule (ADR 0021) reads `account` too.
- **The oracle.** `golden/oracle-routing.ts` imports nothing from the engine: it replays each date's
  routing from the Scenario, day by day, with its own growth, and agrees with every row, the run-out and
  the breakdown lines of the eight parity cases.

## Considered options

- **A "spend what is left" last step.** Rejected for now: a plan that wants it adds an expense, and a
  step that turns surplus into spending changes what saving means and needs its own decision.
- **Round a share half up.** Rejected: the sum of the fills could then exceed the day's surplus, and the
  floor is the one rounding that cannot create money.
- **Key breakdown lines by Account only.** Rejected: an Account that appears twice would be summed in
  one line, which hides the separation the floor is for.
- **Compare floors of different growth at the Timeline start.** Rejected: the order could flip years
  later, so the check would be wrong where it matters.
- **Pass the Timeline start through `processDate` and every walk.** Rejected for the Account state
  carrying it: Financial Independence copies states, so the value travels with the copy.

## Consequences

- New codes in `ERROR_CODES`: `SURPLUS_SHARE_LAST` and `WITHDRAW_FLOOR_ORDER`, worded in the CLI's
  `refusal-routing.ts`.
- Eight cases join `parity/cases.json`: `routing-share-then-rest`, `routing-share-capped`,
  `routing-top-up-then-share`, `routing-floor-then-funds`, `routing-floor-stops-draw`,
  `routing-locked-floor`, `routing-real-floor` and `routing-real-target`. No existing case changes. A ninth, `routing-statement`, joins with the statement: a Timeline from 29 February
  2028, a grown `upTo` of 1,000,000 (1,092,727 after three anniversaries), a nominal `upTo`, a floor at -100 bps
  (291,090), a nominal floor and a plain entry.
- Hand-worked tests (`golden/routing-hand.test.ts`): 1,000,001 splits 300,000 and 700,001; a share of 3000
  capped at 250,000 leaves 750,000; a top-up of 50,000 then half of 950,000 gives 475,000 and 475,000;
  savings 500,000 and funds 200,000 against a 600,000 bill draw 200,000, 200,000 and 200,000; a lone floor
  leaves 400,000 unmet and savings at 300,000; a locked Account with a floor of 0 is skipped; a floor of
  300,000 is 347,782 after five years at 3% and an `upTo` of 1,000,000 is 1,159,274.

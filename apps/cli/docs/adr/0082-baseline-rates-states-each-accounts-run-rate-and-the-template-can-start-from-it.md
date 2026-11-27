# baseline rates states each income and expense Account's run-rate, and the template can start from it

Status: accepted (trajectonomics/trajectonomics#687).

`traj baseline rates` states, for each income and expense Leaf Account with activity, its total over
whole calendar months ending at the last full month on or before the As-of, and a Run-rate: the
total over the months the record covers, or over the times its one calendar month falls in them when
the window spans a year and every active month is that month, rounded half away from zero. Nothing
is inferred beyond that stated rule. An archived Account, a negative total and a zero total are
stated and marked as left out, never dropped. `scenario apply --template --as-of --from-history`
writes one Stream per carried row, with the Account id as its id, the name as its label and
category, `earned: true` and inflation growth. The two zero Streams of ADR-0044 stay when the flag
is absent. `--template` now takes `--decimal`. The rule of ADR-0044 holds: the read states, the
caller applies.

## Decision

- **The window is whole calendar months.** `--months` is 3 to 36, default 12, and the window ends at
  the last full month on or before the As-of: the As-of month counts only when the As-of is its
  last day. A part-month is never divided into a rate, because it would make the rate too low.
- **The rate divides by the months the record covers**, not by the months asked for: the covered
  months are the window's months on or after the record's first full month, which is the month of
  the first Transaction when it is dated the 1st and the month after it otherwise. Dividing by the
  months asked for would make the rate too low by a factor the person cannot see.
- **An irregular Account is yearly only when it can be checked by hand:** the covered window spans
  at least twelve months and every month with activity is the same calendar month. Otherwise it is
  monthly. A row is never dropped for being irregular.
- **The stated sign is the Baseline's:** income is shown positive, expense stays as the raw sum.
  Totals include every row of their type, the rows left out of the template included.
- **A row that cannot be a Stream is stated and marked:** `archived` first, then `negative`, then
  `zero`, with `inTemplate: false` and the reason. The read is where the person sees what was left
  out.
- **Every Stream is earned income and grows with inflation.** A template has to apply unchanged;
  the caller may edit either. `economy.inflation` stays `0`, matching the ADR-0044 placeholders.
- **The Flow id is the Account id.** It is unique and stable, so it joins a row to its Flow. The
  Account's name becomes `displayLabel` (up to 80 characters) and an expense's `category` (up to
  64), when it is already written without leading or trailing whitespace.
- **A currency other than THB is refused** at `rows.<accountId>`, as the Baseline mapping does. A
  sum outside the safe range is `AMOUNT_OVERFLOW` at `rows.<accountId>`.
- **The template takes its own flags:** `--from-history` says where the Streams come from and
  `--months` sizes the window; the parser has no flag whose value is optional, so these are two
  flags rather than `--from-history=<n>`. `--decimal` prints the template's decimal form, because
  the Dashboard has to put typed decimal amounts into it and may not convert minor units.

## Considered options

Dividing by the months asked for was rejected because a short record then reads as a lower rate
with no visible cause. Dropping an Account's row when its total is negative or zero was rejected
because the person would not see why the template lacks it. A `--from-history=<n>` spelling was
rejected because the flag parser has no optional values. Converting a zero Stream into a real
amount on the template was rejected: the read states, the caller applies (ADR-0044).

## Consequences

A template built from history is a starting point the caller may edit, not a forecast: the read
states what the Ledger states and nothing else. The two zero Streams remain for a caller who wants
the ADR-0044 template, and an absent `--from-history` changes no existing output. The Dashboard's
guided first plan (#688) reads `baseline rates` and the decimal template, and computes no figure of
its own.

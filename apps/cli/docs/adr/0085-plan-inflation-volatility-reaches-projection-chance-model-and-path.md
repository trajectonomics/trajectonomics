# Plan inflation volatility reaches projection chance, model and path

Status: accepted. Ships in 0.8.0.

Sim ADR 0033 draws one inflation rate per Market path from a plan's own inflation factor: the Scenario's
`economy.inflation` as the mean and the new `economy.inflationVolatility` as the yearly standard deviation.
Until this release nothing outside the sim could state the spread, and the CLI refused a plan with no volatile
Account even when the plan's inflation swung. This ADR carries the field through the CLI, echoes the factor, and
lets the chance of success state today's money. It amends ADR-0065 (`--set` may begin the key) and ADR-0068 (the
refusal).

## Decision

- **`economy.inflationVolatility` is a Scenario field.** `scenario apply`, `--set` and `traj schema` take it as an
  integer of basis points from 0 to 10000, the standard deviation of one year's inflation. Its description says
  that only the chance of success reads it, that absent or 0 holds inflation at `inflation` on every Market path,
  and that the figure is the caller's own: `traj` ships none. In `--decimal` it stays an integer of basis points,
  as `inflation` does. The engine checks it: 10001 is `RATE_OUT_OF_RANGE` and 1.5 is `NOT_SAFE_INTEGER`, both
  worded as a rate.
- **A `--set` may begin an absent `inflationVolatility`** (amends ADR-0065). No plan states it by default, so
  `--set economy.inflationVolatility=150` is the what-if that gives the chance its first inflation swing when the
  parent is the `economy` object; a typo near it is still `No key or id`. The rule lives with ADR-0065's begin
  entries, in `set-begin.ts`, and `--set accounts.<id>.volatility=…` is unchanged.
- **`--return-model plan` refuses only when neither kind of swing exists** (amends ADR-0068). A plan with no volatile
  Account but an `inflationVolatility` above 0 builds a model with no Accounts and an `inflation` factor, and every
  Market path differs only by inflation. The refusal's sentence and hint name both fields: `volatility` on an asset
  Account, and `economy.inflationVolatility`. The other refusal, a file, and `--buckets` are unchanged.
- **The `returnModel` echo states the factor.** With `economy.inflationVolatility` above 0 it gains
  `inflation: { rate, volatility }`: the Scenario's `inflation` and the spread, both in basis points. Without the
  field the echo has no `inflation` key, so a run without it keeps its bytes. When the engine clamps buckets, the
  notes carry one sentence: "The plan's Return model clamped N of its B buckets of inflation to the range from
  -9999 to 10000 basis points a year."
- **The Return model document gains `inflation`.** `--return-model` reads a file whose model carries the factor, and
  `traj projection model` prints it: the optional strict object `{ buckets: [{ rateBps, weight }] }` whose weights
  total 2^32. `traj schema projection model` and the `--return-model` flag document publish the same shape. The
  human form of `projection model` adds one line when the factor is present: `Inflation: B buckets, mean X bps,
  from MIN to MAX bps a year`.
- **`projection chance` states the Bands in today's money.** It passes the engine's `realBands` through as a field
  of the same shape as `bands`, present only with a factor, and the human Bands table gains a `Median (today's
  money)` column right after the nominal median. The column is optional, so a run without a factor prints exactly
  as before, and the committed `chance-plan.output` fixture is unchanged.
- **`projection path` states each roll-up's inflation.** The engine's `inflationBps` is passed through on every
  Annual roll-up, present only with a factor, and the human returns table gains an `Inflation` column. A model with
  no Account keeps its roll-up row when it has the column, so the inflation is not dropped.
- **The Dashboard's contract follows in the same release.** Its strict parsers in
  `apps/web/src/lib/contract/projection-chance.ts` and `projection-path.ts` accept the optional `realBands`,
  `inflationBps` and `inflation` echo, and the Bands table row's optional `p50Real`. No page changes here: the Chance
  page switch is a later pull request. Without the parsers the Dashboard would refuse the new output, so they ship
  with the CLI.

## Considered options

- **Treating inflation volatility as an Account field.** Rejected: inflation is one plan-wide assumption, and the
  engine's factor lives in the Return model, not in a bucket column of an Account.
- **Refusing a plan with no volatile Account even when inflation swings.** Rejected: sim ADR 0033 accepts a
  zero-account model, and a plan whose only risk is inflation has a real chance of success.
- **A default inflation volatility.** Rejected, as every rate is (ADR-0063): how much inflation may swing is a
  decision about the meaning of money, and `traj` ships none.
- **Deflating the spending Bands too.** Left out: sim ADR 0033 states real spending Bands as a follow-up, so the
  CLI states only the net-worth Bands in today's money.

## Consequences

- A person can test inflation risk without stating an Account volatility, and the chance echoes the rate and spread
  it drew from.
- Every output without the field is byte for byte what it was; the `chance-plan.output` fixture and every parity
  case are unchanged.
- A Return-model file saved before this change still reads and draws no inflation; a new file with `inflation` read
  by an older engine fails on the strict shape, which is accepted because no forward compatibility is promised.

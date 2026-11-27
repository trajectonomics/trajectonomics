# Inflation is drawn per Market path from an inflation factor

Status: accepted

ADR 0029 holds inflation fixed on every Market path: the Scenario's `economy.inflation` grows every
inflation-following Flow and deflates every real figure, whatever the market does. For a retiree living on
savings a run of high inflation is as dangerous as a bad market, and a chance of success that holds it fixed
overstates safety for exactly the people who rely on it (#694). This ADR adds `economy.inflationVolatility`,
the Return model's `inflation` factor and the Price path one Market path follows. A plan that states no
volatility keeps every figure it has today, byte for byte.

## Decision

- **The field.** `economy.inflationVolatility` is an optional integer from 0 to 10000, the standard deviation
  of one year's rate in basis points. Out of range is `RATE_OUT_OF_RANGE` and a non-integer is
  `NOT_SAFE_INTEGER`. It is an additive field, so `Scenario.schemaVersion` stays 4 (precedent: ADRs 0026 to
  0029). `project()`, FI and every deterministic figure ignore it; only `planReturnModel` and
  `chanceOfSuccess` read it.
- **The factor.** With a volatility above 0, `planReturnModel` adds `inflation` to the model: one rate per
  bucket, over the same standard normal table and the same `2^32 / buckets` weight as the markets. The rate is
  `mean + z_b x volatility`, rounded to whole basis points by largest remainder, then clamped to
  `[-9999, 10000]`; `inflationClamped` counts the clamps and is present only when it is above 0. Because the
  table is odd-symmetric and the weights are equal, the rates sum to exactly `buckets x mean`: a plan's stated
  inflation is the factor's exact mean, not an approximation. A model with no factor has no `inflation` key.
- **The draw order.** The inflation draws come after the market draws, on the same path stream. A path consumes
  `dates.length` words from `pathSeed(seed, index)` for its Market rows, exactly as it did before, then `Y + 1`
  more, where `Y = growthYears(timeline.start, timeline.horizon)` and the extra one covers the year holding the
  horizon. Year `j` takes the next SplitMix64 word, and its high 32 bits pick the bucket. So turning a factor on
  leaves every Account's rows identical: inflation gives common random numbers for the markets. The overlap
  estimate of ADR 0005 stays at about 1e-8, now over at most 1,200 + 101 words.
- **Who follows the path.** Everything that follows inflation follows the path: a Flow's `growth: "inflation"`,
  a routing target or Reserve floor with `growth: "inflation"` (ADR 0030), a Spending rule's guardrails and its
  real statement (ADR 0023), a rule-of-thumb reference in real terms, and every real figure the Projection
  reports. `marketPath` and `marketReturns` take the Scenario's `inflation` as `outsideBps` and draw prices only
  when the model has a factor; `chanceOfSuccess` and `projectPath` pass it, and the FI paths pass nothing.
- **The step and the arithmetic.** One rate per growth year, as `growthYears` counts them. Across whole years the
  rates compound exactly: `prod(10000 + r_j) / 10000^n`, rounded once, half up. Inside a year the year's rate
  applies linearly: `1 + r_Y x rem / 365`. The scalar `deflate` uses a 365th-root daily factor instead, which
  costs about 18 ms per new rate (measured: 50 rates took 892 ms) and holds a per-rate power cache of about
  2 MB; with 256 to 1,024 bucket rates that would add 5 to 20 s per run and over 1 GB of memory. The linear
  form is an exact rational with no root, it equals the scalar exactly on whole years, and mid-year it is above
  the compound deflator by at most 1.2 bps at 300 bps a year. A year outside the drawn ones reads
  `economy.inflation`, which covers a Flow or target that started before the Timeline and any day past the last
  drawn year.
- **Today's money per path.** Each path's figures are deflated by its own Price path. `realBands` is the same
  five nearest-rank Percentiles as `bands`, taken over each path's real closing net worth rather than over its
  nominal one, so a real Band means what it says; a path that ran out is pinned at the real value it died with.
  `PathRollupReturns.inflationBps` states each Annual roll-up's own inflation, as one exact BigInt fraction,
  rounded half away from zero. Both fields are present only when the model has an `inflation` factor.
- **A Derived amount's constants follow the path.** A `const` Measure with `growth: "inflation"` and an `asOf`
  inside a Flow's Derived amount is a Flow amount, so it grows by the run's Price path. The same Measure inside a
  Levy stays nominal (next bullet). `levy/derive.ts` reads the run's inflation through one seam, and
  `engine/derive-constant-seam.test.ts` pins the difference.
- **What the draws do not touch.** Levies keep `scenario.economy.inflation`: Thai brackets and allowances are
  fixed amounts in law, so a Levy's Measures, its caps and its settlements are the same on every path
  (`levy-finish.ts`, `levy-cap.ts`, `levy-settle.ts` and `levy/step.ts` are unchanged). The deterministic
  Projection draws nothing, and neither do the FI scan and the FI probability method: `marketPaths` passes no
  `outsideBps`, so an FI answer is the answer it was.
- **The limits.** The inflation draws are independent of the market draws. A correlation would need a stated
  covariance between the market factor and inflation, and no source in the plan gives one; the market factor of
  ADR 0029 is one shared draw, and a second correlated factor is a later decision. The FI probability method
  ignores the factor, so an FI answer understates inflation risk. Spending Bands stay nominal: what a rule Flow
  paid in each roll-up is not deflated, because a real Spending Band needs the spending deflated at each
  Occurrence's date and is left as a follow-up. A deflation year can make a large real figure overflow; it
  reports `VALUE_OVERFLOW` and does not saturate, so the chance run fails whole (ADR 0011).
- **The contract.** `ChanceOfSuccess.realBands` is additive and present only with a factor, and so is
  `PathRollupReturns.inflationBps`. No error code is new: the factor reuses `RATE_OUT_OF_RANGE`,
  `INVALID_WEIGHT`, `RETURN_WEIGHT_TOTAL` and `TOO_MANY_ENTRIES`, and more than 1,024 buckets is refused as
  the markets' buckets already are. A Return-model file saved before this change reads unchanged and draws no
  inflation; a file with an `inflation` key read by an older engine fails on the strict shape, which is accepted
  because no forward compatibility is promised.

## The benchmark

The freelancer fixture, 1,000 Market paths at the seed `0123456789abcdef`, a 256-bucket plan model, three runs
each, under Bun: inflation off took 6,546 ms and volatility 150 took 9,505 ms, a ratio of 1.45. The stop rule
was 1.5x, and the run stays inside it. The extra time is the 26 roll-ups' real figures, which a plan with no
volatility does not compute at all; the draws themselves cost one word per growth year. A larger Timeline costs
the same words, and a plan with no volatility draws none of them.

## Tests

Each check has a test that fails on the previous engine except the three guards: the already-recorded parity
file, the zero-volatility model, and the unchanged old parity hashes. `market/plan-inflation.test.ts` pins the
exact sum, the odd symmetry, the variance and a clamp; `market/inflation-draws.test.ts` pins the draw order
against `golden/oracle-prng.ts`; `chance/two-bucket-inflation.test.ts` is the issue's hand check over three
years; `chance/real-bands.test.ts` pins the 364-day real value at 909,317; `chance/levy-across-paths.test.ts`
pins the Levy; `engine/project-path-inflation.test.ts` pins the 50-path identity, the one-path real Bands and
a flat 300-bps path; `market/inflation-distribution.test.ts` pins the 1,000-path mean. The new parity cases are
`freelancer-plan-chance-inflation` and `freelancer-path-inflation`.

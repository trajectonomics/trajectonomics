# The bracket walk and the effective rate are pure functions over the table the Levy was emitted from

Status: accepted (trajectonomics/trajectonomics#404).

## Context

A Thai Levy states `taxable.income` and `tax.progressive` as Measures. A caller that wants to say which bracket the income is in, how much of it each bracket holds, how much room is left in the bracket and what share of the assessable income the tax is, has to slice the income across the schedule and divide. The CLI may not do that arithmetic (cli ADR-0058) and the Dashboard may not (web ADR 0002), and a second copy of the brackets and their rounding would drift from the Levy's.

## Decision

`@trajectonomics/tax/th` exports two pure functions. Both take integer satang and return plain data.

- `thBracketWalk(taxableIncome, brackets = TH_2026_PARAMETERS.brackets)` returns `{ slices, progressiveTax, marginalRateBps, toNextBracket? }`. A slice is `{ from, upTo | null, rateBps, income, tax }`. The slices come from `evaluateBrackets`, whose tax per slice the Levy's `scale` Measures reproduce (`levy-brackets.test.ts` pins the match at every boundary), so `progressiveTax` equals the Levy's `tax.progressive` and the caller can check it.
- `thEffectiveRateBps(due, assessable)` returns `floor(due × 10000 / assessable)`, or `undefined` when `assessable` is 0. It multiplies in BigInt, so a product past the safe integers is exact, and a negative `due` (a refund) floors toward minus infinity.

The marginal bracket is the one the last satang of the income falls in: the last slice with income in it, or the first for no income. An income exactly on an edge is in the bracket the edge closes, and `toNextBracket` is `0`. This is the reading of the issue ("the rate of the bracket the last baht falls in"), and it differs from `evaluateBrackets`' `marginalRate`, which is the rate of the next unit and which this walk does not use. The rate is in basis points, read exactly from the decimal the parameter was written as.

## Considered options

- **Reuse `evaluateBrackets`' `marginalRate` and `effectiveRate`.** Rejected: the first answers a different question at an edge, and the second is a float on the taxable income by default.
- **Emit one Measure per slice in the Levy.** Rejected: it changes the Levy every stored Scenario holds, to state what a function of two Measures already gives.
- **Return rates as ratios.** Rejected: a float in a contract. Basis points are integers.

## Consequences

The CLI formats these results and holds no bracket, rate or division of its own. A tax year other than 2026 needs its table passed as `brackets`; today only `TH_2026_PARAMETERS` exists, and the Levy is emitted from it, so the default is the table the Levy used.

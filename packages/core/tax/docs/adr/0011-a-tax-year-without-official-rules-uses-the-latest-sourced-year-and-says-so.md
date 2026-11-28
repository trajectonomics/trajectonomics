# A tax year without official rules uses the latest sourced year's rules, and says so

Status: Accepted. The statement in results is built in trajectonomics/trajectonomics#898.

## Context

The owner's ruling of 2026-11-28: when a Projection reaches a Thai tax year this package has no sourced parameters for (tax year 2027 and later, today), `traj` keeps using the 2026 rules and tells the person it is waiting for the official rules for that year.

Today the CLI already taxes every later year with the `th-2026-pit` Levy, because a Levy's periods recur yearly (`apps/cli/src/projection/periods.ts`), but no result says so.

Thailand publishes no yearly table of personal income tax figures. The brackets and the main allowances stay in force until an Amendment Act, Royal Decree or Ministerial Regulation changes them. The bracket schedule still rests on Act No. 44 (B.E. 2560), and the most recent instrument, Royal Decree No. 805 (gazetted 2 March 2026), added one targeted deduction for rooftop solar. A change can be published at any point in the year, so the 2026 rules are the best estimate for a later year, but still an estimate.

## Decision

The owner ruled:

- A Thai tax year with no sourced parameters is computed with the latest sourced year's parameters (`TH_2026_PARAMETERS` today).
- Every result that taxes such a year tells the person which year's rules it used, and that the official rules for that year have not been published yet.

Consequences of the ruling and of rules already in force:

- The parameters are reused unchanged. Thai figures are not indexed to inflation, so there is nothing to adjust.
- The statement leaves a year only when that year gets its own `TH_<year>_PARAMETERS` and source manifest. Issue #89 already requires every figure to be read again against a source for that year, carrying a 2026 figure forward only where a 2027 source confirms it.
- A year before the latest sourced one is outside this ruling. ADR 0007 records the one path that reaches one (the year before the As-of) and its approximation.

The statement's shape (a field per tax-year row or an `assumptions` status, how `projection compare` reports it, and the human Format line) is decided in #898.

## Considered options

Refusing to tax a year with no sourced parameters would drop the tax from every plan that runs past 31 December 2026, which understates what the plan owes far more than reusing the 2026 rules does. Carrying the rules forward silently, as the CLI does today, would let a person read a 2027 figure as 2027 law. The owner's ruling avoids both.

## Sources

| Source | Read |
| --- | --- |
| Nation Thailand, "Royal Gazette publishes up to 200,000 baht tax relief for home solar": https://www.nationthailand.com/news/policy/40063299 | 2026-11-28 |
| Forvis Mazars, Payroll Flash News, March 2026 (dates Royal Decree No. 805 to 2 March 2026): https://www.forvismazars.com/th/en/insights/doing-business-in-thailand/payroll/forvis-mazars-payroll-flash-news-march-2026 | 2026-11-28 |
| Act No. 44 (B.E. 2560) for the bracket schedule: `references/th/SOURCES.md` and `src/th/parameters-brackets.ts` | 2026-11-28 |

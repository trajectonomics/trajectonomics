# A tax year without official rules uses the latest sourced year's rules, and says so

Owner ruling, 2026-11-28. When a Projection reaches a Thai tax year that this package has no sourced parameters for (tax year 2027 and later, today), `traj` taxes that year with the rules of the latest year it has sourced (`TH_2026_PARAMETERS`) and tells the person it is waiting for that year's official rules.

## Why

Thailand publishes no yearly table of personal income tax figures. The brackets and the main allowances stay in force until an Amendment Act, Royal Decree or Ministerial Regulation changes them: the bracket schedule has not moved since Act No. 44 (B.E. 2560), and recent years changed only targeted deductions (Royal Decree No. 805, gazetted 2 March 2026, added a rooftop solar deduction). A change can be published at any point in the year and often applies from 1 January, and a year's rules are final only when the Revenue Department issues that year's ภ.ง.ด.90/91 guide, around the year's end. Carrying the latest sourced rules forward is therefore the best estimate available, but it is still an estimate, so a result must not present it as that year's law.

## Decision

- A Thai tax year with no sourced parameters is computed with the latest sourced year's parameters, unchanged. Thai figures are not indexed to inflation, so nothing is adjusted.
- Every result that taxes such a year says so for that year: which year's rules it used, and that the official rules for the year have not been published yet. It is a statement a consumer can filter, like the `assumptions` entries in CLI ADR-0042, and the human Format prints it once.
- The statement leaves a year only when that year gets its own parameters and source manifest (`TH_<year>_PARAMETERS`, issue #89), each figure read again against a source for that year, as `references/th/SOURCES.md` requires today. A figure is carried forward into the new year's parameters only where a source for that year confirms it.
- A year before the latest sourced one is outside this ruling. ADR 0007 records the one path that reaches one (the year before the As-of) and its approximation.

## Considered options

Refusing to tax a year with no sourced parameters was rejected: every plan that runs past 31 December 2026 would lose its tax, which understates what the plan owes far more than reusing the 2026 rules does. Carrying the rules forward silently, which is what the CLI does today, was rejected: the person would read a 2027 figure as 2027 law.

## Consequences

The CLI's tax-year rows and the projection golden grow the new statement, built in its own ticket. Issue #89 still decides when tax year 2027 gets its own parameters; this ruling only covers what `traj` says until then.

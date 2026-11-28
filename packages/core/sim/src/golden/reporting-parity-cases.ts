import type { ParityCase } from "./parity-cases"
import { leapDay, levyApril } from "./reporting-cases"

/**
 * The Reporting breakdown fixtures (ADR 0034), appended last to `EVERY_PARITY_CASE`, so
 * `parity/cases.json` only gains lines at its end.
 */
export const REPORTING_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "reporting-levy-april",
		fixture: levyApril,
		projectOptions: { reporting: { yearStart: 4, years: true, monthsOf: "all" } },
	},
	{
		name: "reporting-leap-day",
		fixture: leapDay,
		projectOptions: { reporting: { yearStart: 3, years: true, monthsOf: "all" } },
	},
]

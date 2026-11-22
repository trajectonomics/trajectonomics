import type { ProjectionRun } from "../../contract"
import { MONTHLY_ROWS } from "./monthly-rows.test-support"

export { MONTHLY_ROWS }

/** A hand-made projection, so the tests pin their own figures rather than the Demo snapshot's. */
export type AnnualRow = Extract<ProjectionRun["tables"][number], { name: "annual" }>["rows"][number]
export type MonthlyRow = Extract<
	ProjectionRun["tables"][number],
	{ name: "monthly" }
>["rows"][number]

export const SCENARIO: ProjectionRun["scenario"] = {
	id: "scenario-fixture-1",
	name: "base",
	contentHash: "jcs1:sha256:0123456789abcdef0123456789abcdef",
	effectiveContentHash: "jcs1:sha256:fedcba9876543210fedcba9876543210",
}

export const ENGINE: ProjectionRun["engine"] = { package: "@fixture/engine", version: "9.8.7" }

function annualRow(
	index: number,
	span: { from: string; to: string },
	closing: string,
	real: { amount: string; date: string },
	partial: boolean,
): AnnualRow {
	return {
		index,
		from: span.from,
		to: span.to,
		ages: [],
		openingNetWorth: "1000000.00",
		closingNetWorth: closing,
		income: "120000.00",
		expense: "60000.00",
		contributions: "30000.00",
		unfundedContributions: "0.00",
		interest: "5000.00",
		unmet: "0.00",
		partial,
		realNetWorth: real,
	}
}

/** Three annual rows; the last covers part of a year, as a horizon inside a year does. */
export const ANNUAL_ROWS: readonly AnnualRow[] = [
	annualRow(
		0,
		{ from: "2026-10-31", to: "2027-10-30" },
		"1250000.00",
		{ amount: "1200000.00", date: "2027-10-31" },
		false,
	),
	annualRow(
		1,
		{ from: "2027-10-31", to: "2028-10-30" },
		"1500000.00",
		{ amount: "1400000.00", date: "2028-10-31" },
		false,
	),
	annualRow(
		2,
		{ from: "2028-10-31", to: "2028-12-31" },
		"1550000.00",
		{ amount: "1420000.00", date: "2028-12-31" },
		true,
	),
]

/** A projection run with the given patch over the fixture: no runs-out, no Overrides, no monthly table. */
export function projectionRunFixture(patch: Partial<ProjectionRun> = {}): ProjectionRun {
	return {
		asOf: "2026-10-31",
		horizon: "2028-12-31",
		engine: ENGINE,
		scenario: SCENARIO,
		overrides: [],
		tax: "applied",
		notes: ["Tax is applied: the fixture levy.", "A note the CLI states, in its own order."],
		currency: "THB",
		runsOut: null,
		taxYears: [],
		tables: [{ name: "annual", count: ANNUAL_ROWS.length, rows: [...ANNUAL_ROWS] }],
		...patch,
	}
}

/** The same projection run with `--monthly`: the annual table and the monthly one. */
export function withMonthlyTable(run: ProjectionRun): ProjectionRun {
	return {
		...run,
		tables: [
			...run.tables,
			{ name: "monthly", count: MONTHLY_ROWS.length, rows: [...MONTHLY_ROWS] },
		],
	}
}

import type { CompareSide, ProjectionCompare, ProjectionRun, Read } from "../../contract"
import { BASE } from "./fixtures.test-support"

type Deltas = ProjectionCompare["deltas"]

/** A successful Read of the given data. */
export function ok<T>(data: T): Read<T> {
	return { argv: ["projection", "compare", "--json"], ok: true, data }
}

/** A failed Read with the CLI's message. */
export function failed(message: string): Read<never> {
	return {
		argv: ["projection", "run", "--json"],
		ok: false,
		error: { code: "LEDGER_EMPTY", exitCode: 2, message },
	}
}

/** One annual row of a projection: its closing and real net worth, at the year's end. */
export function annualRow(index: number, closing: string, real: string, to: string) {
	return {
		index,
		from: "2026-10-31",
		to,
		openingNetWorth: "0.00",
		closingNetWorth: closing,
		income: "0.00",
		expense: "0.00",
		contributions: "0.00",
		unfundedContributions: "0.00",
		interest: "0.00",
		unmet: "0.00",
		partial: false,
		realNetWorth: { date: to, amount: real },
	}
}

/** A projection with the given annual rows and its own fields, the rest left as a plain result. */
export function projectionRun(over: Partial<ProjectionRun> = {}): ProjectionRun {
	return {
		asOf: "2026-10-31",
		engine: { package: "@trajectonomics/sim", version: "0.0.0" },
		scenario: BASE,
		overrides: [],
		tax: "applied",
		notes: [],
		horizon: "2060-12-31",
		currency: "THB",
		runsOut: null,
		taxYears: [],
		tables: [{ name: "annual", count: 0, rows: [] }],
		...over,
	}
}

/** The deltas the CLI states for the two sides above: none of the whole-Projection ones. */
export const DEFAULT_DELTAS: Deltas = {
	fiMonths: null,
	runOutYears: null,
	netWorth: null,
	atAges: [
		{ age: 45, nominal: "0.00", real: "0.00" },
		{ age: 55, nominal: "-7531093.78", real: "-4359354.17" },
		{ age: 60, nominal: null, real: null },
	],
}

/** A compare of two sides with the given deltas. */
export function compareOf(a: CompareSide, b: CompareSide, deltas: Deltas): ProjectionCompare {
	return {
		asOf: "2026-10-31",
		horizon: "2060-12-31",
		currency: "THB",
		engine: { package: "@trajectonomics/sim", version: "0.0.0" },
		birthDate: "1990-05-15",
		sides: { a, b },
		deltas,
		tax: "applied",
		notes: ["Tax is applied: Thailand 2026 personal income tax."],
	}
}

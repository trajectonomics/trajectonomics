import { describe, expect, test } from "bun:test"
import { NO_CHANGE, NO_DELTA } from "./cell"
import { AGE_REASON, END_REASON } from "./figure-cells"
import { type FigureRow, figureRows } from "./figure-rows"
import { BASE, EARLY, reachable, SIDE_A, SIDE_B, side } from "./fixtures.test-support"
import { compareOf, DEFAULT_DELTAS } from "./projection.test-support"

function row(rows: readonly FigureRow[], key: string): FigureRow {
	const found = rows.find((candidate) => candidate.key === key)
	if (!found) throw new Error(`no row ${key}`)
	return found
}

const defaults = figureRows(compareOf(SIDE_A, SIDE_B, DEFAULT_DELTAS))

describe("figure rows: the difference is the CLI's delta", () => {
	test("a zero delta reads No change, not a zero figure", () => {
		expect(row(defaults, "age-45-nominal").difference.value).toEqual({
			kind: "text",
			text: NO_CHANGE,
		})
	})

	test("a delta the CLI did not state is a dash, with the reason the data gives", () => {
		const fi = row(defaults, "fi").difference
		expect(fi.value).toEqual({ kind: "text", text: NO_DELTA })
		expect(fi.note).toBe("One FI date is not reachable")
		expect(row(defaults, "final-nominal").difference.note).toBe(END_REASON)
		expect(row(defaults, "run-out").difference.note).toBe("Only one Projection runs out")
		expect(row(defaults, "age-60-nominal").difference.note).toBe(AGE_REASON)
	})

	test("a non-zero money delta is the CLI's string with its sign", () => {
		expect(row(defaults, "age-55-nominal").difference.value).toEqual({
			kind: "money",
			amount: "-7531093.78",
		})
	})

	test("an age a side does not reach shows Not reached on that side", () => {
		expect(row(defaults, "age-60-nominal").b.value).toEqual({ kind: "text", text: "Not reached" })
		expect(row(defaults, "age-60-nominal").a.value).toEqual({
			kind: "money",
			amount: "22869824.55",
		})
	})
})

describe("figure rows: the FI date and the run-out", () => {
	test("an unreachable FI date names the binding it has", () => {
		const cell = row(defaults, "fi").b
		expect(cell.value).toEqual({ kind: "text", text: "Not reachable" })
		expect(cell.note).toBe("Binding: insufficientMoney")
	})

	test("a reachable FI date is a month, and its delta is whole months with the CLI's sign", () => {
		const earlier = side({ ...sideFields(SIDE_A), fi: reachable("2042-10-01") })
		const later = side({ ...sideFields(SIDE_A), scenario: EARLY, fi: reachable("2044-08-01") })
		const rows = (months: number) =>
			figureRows(compareOf(earlier, later, { ...DEFAULT_DELTAS, fiMonths: months }))
		expect(row(rows(22), "fi").difference.value).toEqual({ kind: "text", text: "+22 months" })
		expect(row(rows(-1), "fi").difference.value).toEqual({ kind: "text", text: "−1 month" })
		expect(row(rows(0), "fi").difference.value).toEqual({ kind: "text", text: NO_CHANGE })
		expect(row(rows(22), "fi").a.value).toEqual({ kind: "text", text: "Oct 2042" })
	})

	test("both Projections running out gives the years between them, and neither gives its reason", () => {
		const runsB = side({ ...sideFields(SIDE_B), scenario: BASE })
		const withYears = figureRows(compareOf(SIDE_B, runsB, { ...DEFAULT_DELTAS, runOutYears: 2 }))
		expect(row(withYears, "run-out").difference.value).toEqual({ kind: "text", text: "+2 years" })
		const noneRuns = side({ ...sideFields(SIDE_A), scenario: EARLY })
		const neither = figureRows(compareOf(SIDE_A, noneRuns, DEFAULT_DELTAS))
		expect(row(neither, "run-out").difference.note).toBe("Neither Projection runs out")
	})
})

describe("figure rows: the end of each Projection", () => {
	test("a net worth at the end is dated by its Projection's last row", () => {
		expect(row(defaults, "final-nominal").a.note).toBe("At 31 Dec 2060")
		expect(row(defaults, "final-nominal").b.note).toBe("At 1 May 2056")
	})

	test("a stated net worth difference at the end is the CLI's money, with zero as No change", () => {
		const rows = (nominal: string) =>
			figureRows(
				compareOf(SIDE_A, SIDE_A, { ...DEFAULT_DELTAS, netWorth: { nominal, real: "0.00" } }),
			)
		expect(row(rows("-12.50"), "final-nominal").difference.value).toEqual({
			kind: "money",
			amount: "-12.50",
		})
		expect(row(rows("0.00"), "final-nominal").difference.value).toEqual({
			kind: "text",
			text: NO_CHANGE,
		})
	})
})

/** A side's fields without its scenario, so a test can change one of them. */
function sideFields(source: typeof SIDE_A) {
	return {
		scenario: source.scenario,
		fi: source.fi,
		runOut: source.runOut,
		final: source.netWorth.final,
		atAges: source.netWorth.atAges,
	}
}

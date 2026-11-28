import { describe, expect, test } from "bun:test"
import type { ProjectionCompare, ProjectionRun, Read } from "../../contract"
import { type ChartState, chartSides, comparisonChart } from "./chart"
import { reachable, SIDE_A, SIDE_B, UNREACHABLE } from "./fixtures.test-support"
import { compareFocusView } from "./focus"
import {
	annualRow,
	compareOf,
	DEFAULT_DELTAS,
	failed,
	ok,
	projectionRun,
} from "./projection.test-support"

type Row = ReturnType<typeof annualRow>

/** An annual row whose period starts where the test says; the helper fixes it at the As-of. */
function row(index: number, from: string, to: string, closing: string): Row {
	return { ...annualRow(index, closing, closing, to), from }
}

function runOf(rows: readonly Row[]): ProjectionRun {
	return projectionRun({ tables: [{ name: "annual", count: rows.length, rows: [...rows] }] })
}

function chartOf(
	data: ProjectionCompare,
	a: Read<ProjectionRun> | undefined,
	b: Read<ProjectionRun> | undefined,
): ChartState {
	const projections: Record<string, Read<ProjectionRun>> = {}
	if (a) projections[data.sides.a.scenario.name] = a
	if (b) projections[data.sides.b.scenario.name] = b
	return comparisonChart(chartSides(projections, data), "nominal")
}

const aRows = [
	row(0, "2039-10-31", "2040-10-30", "100.00"),
	row(1, "2040-10-31", "2041-10-30", "200.00"),
]
const bRows = [
	row(0, "2039-10-31", "2040-10-30", "300.00"),
	row(1, "2040-10-31", "2041-10-30", "400.00"),
]

/** Both plans reach, A in Oct 2040 and B two years later, with the gap the test states. */
function bothReach(months: number | null): ProjectionCompare {
	return compareOf(
		{ ...SIDE_A, fi: reachable("2040-10-01") },
		{ ...SIDE_B, fi: reachable("2042-10-01") },
		{ ...DEFAULT_DELTAS, fiMonths: months },
	)
}

describe("compareFocusView", () => {
	test("answers with the earlier FI date, accents its line and links its Plan page", () => {
		const data = bothReach(24)
		const focus = compareFocusView(data, chartOf(data, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(focus?.winner).toEqual({ name: "base", month: "Oct 2040" })
		expect(focus?.tone).toBe("plain")
		expect(focus?.gap).toBe(24)
		expect(focus?.lines.map((line) => [line.key, line.accent])).toEqual([
			["a", true],
			["b", false],
		])
		expect(focus?.action).toEqual({
			label: "Open this plan",
			href: "/projection/?scenario=base",
		})
		expect(focus?.label).toBe(
			"Which plan lets you stop soonest? base, in Oct 2040. 24 months sooner than retire-early.",
		)
	})

	test("answers with B when B stops sooner, and its gap is the CLI's, absolute", () => {
		const data = compareOf(
			{ ...SIDE_A, fi: reachable("2042-10-01") },
			{ ...SIDE_B, fi: reachable("2040-10-01") },
			{ ...DEFAULT_DELTAS, fiMonths: -14 },
		)
		const focus = compareFocusView(data, chartOf(data, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(focus?.winner).toEqual({ name: "retire-early", month: "Oct 2040" })
		expect(focus?.gap).toBe(14)
		expect(focus?.lines.map((line) => line.accent)).toEqual([false, true])
		expect(focus?.action?.href).toBe("/projection/?scenario=retire-early")
		expect(focus?.label).toBe(
			"Which plan lets you stop soonest? retire-early, in Oct 2040. 14 months sooner than base.",
		)
	})

	test("gives a tie to A", () => {
		const data = compareOf(
			{ ...SIDE_A, fi: reachable("2041-05-01") },
			{ ...SIDE_B, fi: reachable("2041-05-01") },
			DEFAULT_DELTAS,
		)
		const focus = compareFocusView(data, chartOf(data, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(focus?.winner).toEqual({ name: "base", month: "May 2041" })
		expect(focus?.lines.map((line) => line.accent)).toEqual([true, false])
	})

	test("lets the reachable plan win with no gap when the other never reaches", () => {
		const data = compareOf(
			{ ...SIDE_A, fi: reachable("2040-10-01") },
			{ ...SIDE_B, fi: UNREACHABLE },
			{ ...DEFAULT_DELTAS, fiMonths: 8 },
		)
		const focus = compareFocusView(data, chartOf(data, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(focus?.winner).toEqual({ name: "base", month: "Oct 2040" })
		expect(focus?.gap).toBeNull()
		expect(focus?.label).toBe("Which plan lets you stop soonest? base, in Oct 2040.")
		const other = compareOf(
			{ ...SIDE_A, fi: UNREACHABLE },
			{ ...SIDE_B, fi: reachable("2041-01-01") },
			{ ...DEFAULT_DELTAS, fiMonths: 8 },
		)
		expect(
			compareFocusView(other, chartOf(other, ok(runOf(aRows)), ok(runOf(bRows))))?.winner,
		).toEqual({ name: "retire-early", month: "Jan 2041" })
	})

	test("answers with warn tone and the horizon when neither plan reaches", () => {
		const data = compareOf(
			{ ...SIDE_A, fi: UNREACHABLE },
			{ ...SIDE_B, fi: UNREACHABLE },
			{ ...DEFAULT_DELTAS, fiMonths: 3 },
		)
		const focus = compareFocusView(data, chartOf(data, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(focus?.winner).toBeNull()
		expect(focus?.tone).toBe("warn")
		expect(focus?.gap).toBeNull()
		expect(focus?.action).toBeNull()
		expect(focus?.lines.every((line) => line.dot === null)).toBe(true)
		expect(focus?.label).toBe(
			"Which plan lets you stop soonest? Neither plan reaches financial independence by Dec 2060.",
		)
	})

	test("states a gap only from the CLI's months, never one worked out from the dates", () => {
		const none = bothReach(null)
		const quiet = compareFocusView(none, chartOf(none, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(quiet?.gap).toBeNull()
		expect(quiet?.label).toBe("Which plan lets you stop soonest? base, in Oct 2040.")
		const stated = bothReach(99)
		const loud = compareFocusView(stated, chartOf(stated, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(loud?.gap).toBe(99)
		const one = bothReach(1)
		expect(compareFocusView(one, chartOf(one, ok(runOf(aRows)), ok(runOf(bRows))))?.label).toBe(
			"Which plan lets you stop soonest? base, in Oct 2040. 1 month sooner than retire-early.",
		)
	})

	test("dots the annual row that holds the FI date, and no row when none holds it", () => {
		const data = compareOf(
			{ ...SIDE_A, fi: reachable("2040-10-01") },
			{ ...SIDE_B, fi: UNREACHABLE },
			DEFAULT_DELTAS,
		)
		const focus = compareFocusView(data, chartOf(data, ok(runOf(aRows)), ok(runOf(bRows))))
		expect(focus?.lines[0]?.dot).toEqual({ x: 0, y: 100 })
		expect(focus?.lines[0]?.points).toBe("0,100 100,66.7")
		expect(focus?.lines[1]?.dot).toBeNull()
		expect(focus?.lines[1]?.points).toBe("0,33.3 100,0")
		const later = compareOf(
			{ ...SIDE_A, fi: reachable("2041-01-01") },
			{ ...SIDE_B, fi: UNREACHABLE },
			DEFAULT_DELTAS,
		)
		expect(
			compareFocusView(later, chartOf(later, ok(runOf(aRows)), ok(runOf(bRows))))?.lines[0]?.dot,
		).toEqual({ x: 100, y: 66.7 })
		const beyond = compareOf(
			{ ...SIDE_A, fi: reachable("2050-01-01") },
			{ ...SIDE_B, fi: UNREACHABLE },
			DEFAULT_DELTAS,
		)
		expect(
			compareFocusView(beyond, chartOf(beyond, ok(runOf(aRows)), ok(runOf(bRows))))?.lines[0]?.dot,
		).toBeNull()
	})

	test("draws a flat pair across the middle", () => {
		const flat = [
			row(0, "2039-10-31", "2040-10-30", "100.00"),
			row(1, "2040-10-31", "2041-10-30", "100.00"),
		]
		const data = compareOf(
			{ ...SIDE_A, fi: reachable("2040-10-01") },
			{ ...SIDE_B, fi: UNREACHABLE },
			DEFAULT_DELTAS,
		)
		const focus = compareFocusView(data, chartOf(data, ok(runOf(flat)), ok(runOf(flat))))
		expect(focus?.lines[0]?.dot).toEqual({ x: 0, y: 50 })
		expect(focus?.lines[0]?.points).toBe("0,50 100,50")
	})

	test("has no focus point when the chart cannot be drawn", () => {
		const data = bothReach(24)
		const state = chartOf(data, ok(runOf(aRows)), failed("The Scenario is empty."))
		expect(compareFocusView(data, state)).toBeNull()
	})
})

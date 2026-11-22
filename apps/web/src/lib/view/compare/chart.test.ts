import { describe, expect, test } from "bun:test"
import type { ProjectionRun, Read } from "../../contract"
import { chartSides, comparisonChart, parseTerms } from "./chart"
import { SIDE_A, SIDE_B } from "./fixtures.test-support"
import {
	annualRow,
	compareOf,
	DEFAULT_DELTAS,
	failed,
	ok,
	projectionRun,
} from "./projection.test-support"

const data = compareOf(SIDE_A, SIDE_B, DEFAULT_DELTAS)

const runA = projectionRun({
	tables: [
		{
			name: "annual",
			count: 2,
			rows: [
				annualRow(0, "1000.00", "900.00", "2027-10-30"),
				annualRow(1, "2000.00", "1800.00", "2028-10-30"),
			],
		},
	],
})

const runB = projectionRun({
	tables: [{ name: "annual", count: 1, rows: [annualRow(0, "500.00", "450.00", "2027-10-30")] }],
})

function sidesWith(a: Read<ProjectionRun> | undefined, b: Read<ProjectionRun> | undefined) {
	const projections: Record<string, Read<ProjectionRun>> = {}
	if (a) projections["base"] = a
	if (b) projections["retire-early"] = b
	return chartSides(projections, data)
}

describe("comparison chart", () => {
	test("draws A solid and B dashed, one point per year, nominal or real", () => {
		const state = comparisonChart(sidesWith(ok(runA), ok(runB)), "nominal")
		if (state.kind !== "chart") throw new Error("expected a chart")
		const [a, b] = state.series
		expect(a?.name).toBe("base")
		expect(a?.dashed).toBe(false)
		expect(b?.name).toBe("retire-early")
		expect(b?.dashed).toBe(true)
		expect(a?.points.map((point) => point.display)).toEqual(["1,000.00", "2,000.00"])
		expect(a?.points[0]?.xLabel).toBe("Oct 2027")
		expect(b?.points.map((point) => point.y)).toEqual([500])
	})

	test("the real terms read each year's real net worth, not its closing", () => {
		const state = comparisonChart(sidesWith(ok(runA), ok(runB)), "real")
		if (state.kind !== "chart") throw new Error("expected a chart")
		expect(state.series[0]?.points.map((point) => point.y)).toEqual([900, 1800])
	})

	test("a failed Projection Read leaves the chart out and says why, with the CLI's message", () => {
		const state = comparisonChart(sidesWith(ok(runA), failed("The Scenario is empty.")), "nominal")
		expect(state).toEqual({
			kind: "unavailable",
			reasons: ["The Projection of retire-early could not be read: The Scenario is empty."],
		})
	})

	test("a Scenario with no Projection in the Snapshot leaves the chart out", () => {
		const state = comparisonChart(sidesWith(ok(runA), undefined), "nominal")
		expect(state).toEqual({
			kind: "unavailable",
			reasons: ["There is no Projection of retire-early to chart."],
		})
	})
})

describe("terms", () => {
	test("only real is real; anything else, including a missing value, is nominal", () => {
		expect(parseTerms("real")).toBe("real")
		expect(parseTerms("nominal")).toBe("nominal")
		expect(parseTerms("")).toBe("nominal")
		expect(parseTerms("other")).toBe("nominal")
	})
})

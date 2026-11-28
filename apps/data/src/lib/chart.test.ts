import { describe, expect, test } from "bun:test"
import { CHART_HEIGHT, CHART_WIDTH, chartAriaLabel, chartGeometry, niceMax } from "./chart"
import type { ChartSeries } from "./types"

function line(overrides: Partial<ChartSeries> = {}): ChartSeries {
	return {
		plan: "claude",
		name: "Claude",
		total: 150,
		points: [
			{ label: "2026-11-24", tokens: 100 },
			{ label: "2026-11-25", tokens: 50 },
			{ label: "2026-11-26", tokens: 0 },
		],
		...overrides,
	}
}

describe("the chart's scale", () => {
	test("rounds up to the 1, 2, 5, 10 series", () => {
		expect(niceMax(0)).toBe(0)
		expect(niceMax(1)).toBe(1)
		expect(niceMax(1.2)).toBe(2)
		expect(niceMax(4)).toBe(5)
		expect(niceMax(6)).toBe(10)
		expect(niceMax(1234)).toBe(2000)
	})

	test("does not round a round number up", () => {
		expect(niceMax(500)).toBe(500)
	})
})

describe("the chart geometry", () => {
	test("has nothing to draw without a plan", () => {
		expect(chartGeometry([])).toBeNull()
	})

	test("spreads the days across the plot", () => {
		const chart = chartGeometry([line()])
		expect(chart?.width).toBe(CHART_WIDTH)
		expect(chart?.height).toBe(CHART_HEIGHT)
		expect(chart?.lines[0]?.points[0]?.x).toBe(64)
		expect(chart?.lines[0]?.points[2]?.x).toBe(CHART_WIDTH - 16)
	})

	test("puts the largest value at the top of the plot", () => {
		const chart = chartGeometry([line()])
		expect(chart?.max).toBe(100)
		expect(chart?.lines[0]?.points[0]?.y).toBe(16)
		expect(chart?.lines[0]?.points[1]?.y).toBe(132)
	})

	test("labels both ends of the window", () => {
		const chart = chartGeometry([line()])
		expect(chart?.xTicks.map((tick) => tick.label)).toEqual([
			"2026-11-24",
			"2026-11-25",
			"2026-11-26",
		])
		expect(chart?.yTicks).toHaveLength(5)
		expect(chart?.yTicks[0]?.value).toBe(100)
		expect(chart?.yTicks[4]?.value).toBe(0)
	})

	test("draws a single day in the middle of the plot", () => {
		const chart = chartGeometry([line({ points: [{ label: "2026-11-27", tokens: 120 }] })])
		// The plot runs from x=64 to x=704, so one day sits at its centre.
		expect(chart?.lines[0]?.points[0]?.x).toBe(384)
		expect(chart?.xTicks).toEqual([{ label: "2026-11-27", x: 384 }])
	})
})

describe("the chart's description", () => {
	test("names the window and every plan", () => {
		expect(
			chartAriaLabel(
				[line(), line({ plan: "cursor", name: "Cursor" })],
				"2026-11-24",
				"2026-11-26",
			),
		).toBe(
			"Line chart of total tokens per UTC day for 3 days, 2026-11-24 to 2026-11-26. Plans: Claude, Cursor.",
		)
	})

	test("says one day in the singular", () => {
		expect(
			chartAriaLabel(
				[line({ points: [{ label: "2026-11-27", tokens: 120 }] })],
				"2026-11-27",
				"2026-11-27",
			),
		).toBe(
			"Line chart of total tokens per UTC day for 1 day, 2026-11-27 to 2026-11-27. Plans: Claude.",
		)
	})

	test("names the hour or week unit when the chart is bucketed by it", () => {
		const hours = Array.from({ length: 24 }, (_, index) => ({ label: `h${index}`, tokens: 0 }))
		expect(chartAriaLabel([line({ points: hours })], "2026-11-28", "2026-11-28", "hour")).toBe(
			"Line chart of total tokens per UTC hour for 24 hours, 2026-11-28 to 2026-11-28. Plans: Claude.",
		)
		const weeks = Array.from({ length: 13 }, (_, index) => ({ label: `w${index}`, tokens: 0 }))
		expect(chartAriaLabel([line({ points: weeks })], "2026-09-01", "2026-11-25", "week")).toBe(
			"Line chart of total tokens per UTC week for 13 weeks, 2026-09-01 to 2026-11-25. Plans: Claude.",
		)
	})
})

import { describe, expect, test } from "bun:test"
import { CHART_HEIGHT, CHART_WIDTH, chartAriaLabel, chartGeometry, niceMax } from "./chart"
import type { ChartSeries } from "./types"

function line(overrides: Partial<ChartSeries> = {}): ChartSeries {
	return {
		plan: "claude",
		name: "Claude",
		total: 150,
		points: [
			{ day: "2026-11-24", tokens: 100 },
			{ day: "2026-11-25", tokens: 50 },
			{ day: "2026-11-26", tokens: 0 },
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
		expect(chart?.xTicks.map((tick) => tick.day)).toEqual([
			"2026-11-24",
			"2026-11-25",
			"2026-11-26",
		])
		expect(chart?.yTicks).toHaveLength(5)
		expect(chart?.yTicks[0]?.value).toBe(100)
		expect(chart?.yTicks[4]?.value).toBe(0)
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
})

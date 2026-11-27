import { describe, expect, test } from "bun:test"
import { type ScatterPoint, scatterAriaLabel, scatterGeometry } from "./scatter"

function point(x: number, y: number, key = "claude"): ScatterPoint {
	return { key, label: key, x, y }
}

describe("scatterGeometry", () => {
	test("has nothing to draw without a dot", () => {
		expect(scatterGeometry([])).toBeNull()
	})

	test("puts the smallest value at the bottom left and the largest at the top right", () => {
		const chart = scatterGeometry([point(0, 0, "a"), point(100, 100, "b")])
		if (chart === null) throw new Error("no chart")
		expect(chart.dots[0]?.cx).toBeCloseTo(80, 6)
		expect(chart.dots[0]?.cy).toBeCloseTo(304, 6)
		expect(chart.dots[1]?.cx).toBeCloseTo(696, 6)
		expect(chart.dots[1]?.cy).toBeCloseTo(24, 6)
	})

	test("draws a log axis when one value dwarfs another", () => {
		const chart = scatterGeometry([point(1, 80, "a"), point(1000, 90, "b")])
		if (chart === null) throw new Error("no chart")
		expect(chart.xAxis.kind).toBe("log")
		expect(chart.yAxis.kind).toBe("linear")
	})

	test("keeps a fixed x domain", () => {
		const chart = scatterGeometry([point(50, 10)], [0, 100])
		expect(chart?.xAxis.min).toBe(0)
		expect(chart?.xAxis.max).toBe(100)
	})

	test("shades the area above the median on both axes", () => {
		const chart = scatterGeometry([point(10, 10, "a"), point(20, 20, "b"), point(30, 30, "c")])
		if (chart === null) throw new Error("no chart")
		// The median of each axis is 20, on a 0..30 domain shared by both.
		expect(chart.best.x).toBeCloseTo(80 + (20 / 30) * 616, 6)
		expect(chart.best.y).toBe(24)
		expect(chart.best.height).toBeCloseTo((1 - 20 / 30) * 280, 6)
	})

	test("shades the upper-right third when there are fewer than three dots", () => {
		const chart = scatterGeometry([point(10, 10, "a"), point(20, 20, "b")])
		if (chart === null) throw new Error("no chart")
		expect(chart.best.x).toBeCloseTo(80 + (2 / 3) * 616, 6)
		expect(chart.best.y).toBe(24)
		expect(chart.best.height).toBeCloseTo((1 / 3) * 280, 6)
	})
})

describe("scatterAriaLabel", () => {
	test("names both axes and every plan", () => {
		expect(
			scatterAriaLabel(
				[point(1, 2, "claude"), { ...point(2, 3, "cursor"), label: "Cursor" }],
				"API value per $1",
				"Tokens per $1",
			),
		).toBe(
			"Scatter chart of Tokens per $1 against API value per $1 for 2 plans. Plans: claude, Cursor.",
		)
	})
})

import { describe, expect, test } from "bun:test"
import { historyFocus } from "./history"

/** Three month-ends, one a month, each with a label. */
function points(values: readonly number[]) {
	return values.map((y, x) => ({ x, y, label: `M${x}` }))
}

describe("historyFocus", () => {
	test("draws a rising history from the left edge to the right, its last point at the top", () => {
		const chart = historyFocus(points([0, 50, 100]), 3, 640, 220)
		if (chart === null) throw new Error("three values draw a line")
		expect(chart.line.startsWith("M10 210")).toBe(true)
		expect(chart.line.endsWith("L630 64")).toBe(true)
		expect(chart.last).toEqual({ x: 630, y: 64, label: "M2" })
		expect(chart.plot).toEqual({ left: 10, right: 630, top: 64, bottom: 210 })
		expect(chart.area.startsWith(chart.line)).toBe(true)
		expect(chart.area.endsWith("L10 210 Z")).toBe(true)
	})

	test("keeps zero on the chart, and closes the fill at zero rather than the plot's bottom", () => {
		const chart = historyFocus(points([-100, 0, 100]), 3, 640, 220)
		if (chart === null) throw new Error("three values draw a line")
		expect(chart.zero).toBe(137)
		expect(chart.line).toContain("210")
		expect(chart.line).toContain("137")
		expect(chart.last.y).toBe(64)
		expect(chart.area.endsWith("L10 137 Z")).toBe(true)
	})

	test("draws a flat history in the middle of the plot, its fill closed through the middle", () => {
		const chart = historyFocus(points([0, 0, 0]), 3, 640, 220)
		expect(chart?.last.y).toBe(137)
		expect(chart?.area.endsWith("L10 137 Z")).toBe(true)
	})

	test("places one value at the left edge, and has nothing for no values", () => {
		expect(historyFocus(points([5]), 1, 640, 220)?.last).toEqual({ x: 10, y: 64, label: "M0" })
		expect(historyFocus([], 1, 640, 220)).toBeNull()
	})

	test("keeps the month's index, so a failed month leaves its gap in the line", () => {
		const chart = historyFocus(
			[
				{ x: 0, y: 0, label: "Jan 2026" },
				{ x: 2, y: 100, label: "Mar 2026" },
			],
			4,
			640,
			220,
		)
		if (chart === null) throw new Error("two values draw a line")
		expect(chart.line).toBe("M10 210 L423.33 64")
		expect(chart.last).toEqual({ x: 423.3333333333333, y: 64, label: "Mar 2026" })
	})
})

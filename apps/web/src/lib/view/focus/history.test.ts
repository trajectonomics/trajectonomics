import { describe, expect, test } from "bun:test"
import { historyFocus } from "./history"

describe("historyFocus", () => {
	test("draws a rising history from the left edge to the right, its last point at the top", () => {
		const chart = historyFocus([0, 50, 100], 640, 220)
		if (chart === null) throw new Error("three values draw a line")
		expect(chart.line.startsWith("M10 210")).toBe(true)
		expect(chart.line.endsWith("L630 64")).toBe(true)
		expect(chart.last).toEqual({ x: 630, y: 64 })
		expect(chart.plot).toEqual({ left: 10, right: 630, top: 64, bottom: 210 })
		expect(chart.area.startsWith(chart.line)).toBe(true)
		expect(chart.area.endsWith("L10 210 Z")).toBe(true)
	})

	test("keeps zero on the chart, so a negative month is drawn under it", () => {
		const chart = historyFocus([-100, 0, 100], 640, 220)
		if (chart === null) throw new Error("three values draw a line")
		expect(chart.line).toContain("210")
		expect(chart.line).toContain("137")
		expect(chart.last.y).toBe(64)
	})

	test("draws a flat history in the middle of the plot", () => {
		const chart = historyFocus([0, 0, 0], 640, 220)
		expect(chart?.last.y).toBe(137)
	})

	test("places one value at the left edge, and has nothing for no values", () => {
		expect(historyFocus([5], 640, 220)?.last).toEqual({ x: 10, y: 64 })
		expect(historyFocus([], 640, 220)).toBeNull()
	})
})

import { describe, expect, test } from "bun:test"

import { type LineSeries, lineLayout } from "../../chart"
import { fanEnds } from "./fan-ends"

const PLOT = { width: 640, height: 240, margin: { top: 12, right: 16, bottom: 28, left: 64 } }

/** One series over two roll-ups, its last point at the given value. */
function series(name: string, first: number, last: number): LineSeries {
	return {
		name,
		points: [
			{ x: 0, xLabel: "2026", y: first, display: String(first) },
			{ x: 1, xLabel: "2027", y: last, display: String(last) },
		],
	}
}

function layoutOf(p10: number, p50: number, p90: number) {
	return lineLayout([series("P10", 0, p10), series("P50", 0, p50), series("P90", 0, p90)], PLOT)
}

describe("fanEnds", () => {
	test("labels the median, the 90th and the 10th where their last points sit", () => {
		const layout = layoutOf(10, 50, 90)
		if (layout === null) throw new Error("three series draw a layout")
		const ends = fanEnds(layout)
		expect(ends.map((end) => end.text)).toEqual(["50th", "90th", "10th"])
		for (const end of ends) expect(end.y).toBeGreaterThan(0)
	})

	test("leaves out an edge whose end would sit on the median's own label", () => {
		const layout = layoutOf(10, 50, 52)
		if (layout === null) throw new Error("three series draw a layout")
		const ends = fanEnds(layout)
		expect(ends.map((end) => end.text)).toEqual(["50th", "10th"])
	})

	test("has no labels when the layout draws no percentile series", () => {
		const plain = lineLayout([series("netWorth", 0, 10)], PLOT)
		if (plain === null) throw new Error("one series draws a layout")
		expect(fanEnds(plain)).toEqual([])
	})
})

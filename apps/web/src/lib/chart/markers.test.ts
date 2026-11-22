import { describe, expect, test } from "bun:test"
import { lineLayout, type Plot } from "./line-layout"

// A plot 300 pixels wide with no margin, so an x of 0..2 maps to pixels 0..300.
const FLAT: Plot = { width: 300, height: 200, margin: { top: 0, right: 0, bottom: 0, left: 0 } }

const series = {
	name: "Net worth",
	points: [
		{ x: 0, xLabel: "2026", y: 100, display: "100.00" },
		{ x: 1, xLabel: "2027", y: 200, display: "200.00" },
		{ x: 2, xLabel: "2028", y: 300, display: "300.00" },
	],
}

describe("lineLayout markers", () => {
	test("places a marker at its x on the same scale as the points", () => {
		const layout = lineLayout([series], FLAT, [{ x: 1.5, label: "reached" }])
		expect(layout?.markers).toEqual([{ x: 225, label: "reached" }])
		expect(layout?.xPixels).toEqual([0, 150, 300])
	})

	test("widens the x axis to take in a marker before the first point, and moves the points with it", () => {
		const layout = lineLayout([series], FLAT, [{ x: -0.5, label: "early" }])
		// The domain is now -0.5..2, a span of 2.5, so the first point is 0.5 of 2.5 across.
		expect(layout?.markers[0]?.x).toBe(0)
		expect(layout?.xPixels[0]).toBeCloseTo(60, 10)
		expect(layout?.xPixels.at(-1)).toBe(300)
	})

	test("has no markers when none are passed", () => {
		expect(lineLayout([series], FLAT)?.markers).toEqual([])
	})

	test("is null for a chart with markers but no points", () => {
		expect(lineLayout([{ name: "none", points: [] }], FLAT, [{ x: 1, label: "a" }])).toBeNull()
	})
})

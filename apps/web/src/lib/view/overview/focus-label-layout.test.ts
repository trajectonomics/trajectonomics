import { describe, expect, test } from "bun:test"
import type { PlotBox } from "./focus-chart-axis"
import { curveYsIn, type LabelBox, placeBox, placeLabel } from "./focus-label-layout"

const PLOT: PlotBox = { left: 12, right: 188, top: 16, bottom: 144 }
const BOX: LabelBox = { width: 60, height: 20 }
/** A curve that rises from left to right, in the plot's pixels. */
const RISING = [
	{ x: 12, y: 120 },
	{ x: 100, y: 104 },
	{ x: 188, y: 60 },
]

describe("placeLabel", () => {
	test("keeps the whole box above the highest point of the curve within its span", () => {
		const label = placeLabel(RISING, PLOT, { x: 100, y: 104 }, BOX, "right")
		expect(label.x).toBe(108)
		// Within x 108..168 the curve runs from about 102 to about 73: its highest point is 73.
		const ys = curveYsIn(RISING, label.x, label.x + BOX.width)
		const highest = Math.min(...ys)
		expect(label.y + BOX.height).toBeLessThanOrEqual(highest)
		expect(label.y).toBeGreaterThanOrEqual(PLOT.top)
	})

	test("puts the box below the curve when there is no room above it", () => {
		const high = [
			{ x: 12, y: 24 },
			{ x: 100, y: 18 },
			{ x: 188, y: 30 },
		]
		const label = placeLabel(high, PLOT, { x: 100, y: 18 }, BOX, "right")
		const ys = curveYsIn(high, label.x, label.x + BOX.width)
		const lowest = Math.max(...ys)
		expect(label.y).toBeGreaterThanOrEqual(lowest)
		expect(label.y + BOX.height).toBeLessThanOrEqual(PLOT.bottom)
	})

	test("keeps a box that would overhang the plot inside it", () => {
		const wide: LabelBox = { width: 120, height: 20 }
		expect(placeLabel(RISING, PLOT, { x: 20, y: 120 }, wide, "left").x).toBe(PLOT.left)
		expect(placeLabel(RISING, PLOT, { x: 180, y: 60 }, wide, "right").x).toBe(
			PLOT.right - wide.width,
		)
	})

	test("places a centred label on its point, and one with no curve above its point", () => {
		const centred = placeLabel([], PLOT, { x: 100, y: 100 }, BOX, "center")
		expect(centred.x).toBe(70)
		expect(centred.y + BOX.height).toBeLessThanOrEqual(100)
	})

	test("never leaves the plot when the box is taller than the plot", () => {
		const tall: LabelBox = { width: 40, height: 300 }
		const box = placeBox(RISING, PLOT, 40, tall)
		expect(box.y).toBeGreaterThanOrEqual(PLOT.top)
	})
})

describe("curveYsIn", () => {
	test("interpolates the height at the span's ends", () => {
		expect(curveYsIn(RISING, 56, 144)).toEqual([112, 104, 104, 82])
	})

	test("is empty past the curve's span", () => {
		expect(curveYsIn(RISING, 200, 260)).toEqual([])
	})
})

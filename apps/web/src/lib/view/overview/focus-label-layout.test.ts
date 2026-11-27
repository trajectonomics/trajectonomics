import { describe, expect, test } from "bun:test"
import type { PlotBox } from "./focus-chart-axis"
import { curveYsIn, type LabelBox, placeBox, placeLabel } from "./focus-label-layout"
import { BAND_PAD } from "./focus-label-scan"

const PLOT: PlotBox = { left: 12, right: 188, top: 16, bottom: 144 }
const BOX: LabelBox = { width: 60, height: 20 }
/** A curve that rises from left to right, in the plot's pixels. */
const RISING = [
	{ x: 12, y: 120 },
	{ x: 100, y: 104 },
	{ x: 188, y: 60 },
]
/** A wall of line at x 100 that leaves the box no room where the answer's point is. */
const WALL = [
	{ x: 12, y: 120 },
	{ x: 120, y: 120 },
	{ x: 120, y: 20 },
	{ x: 120, y: 140 },
	{ x: 188, y: 140 },
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

	test("moves to another x when the preferred one clears nothing", () => {
		const label = placeLabel(WALL, PLOT, { x: 100, y: 100 }, BOX, "right")
		expect(label.band).toBe(false)
		expect(label.x).not.toBe(108)
		expect(label.x).toBeGreaterThanOrEqual(PLOT.left)
		expect(label.x + BOX.width).toBeLessThanOrEqual(PLOT.right)
		const ys = curveYsIn(WALL, label.x, label.x + BOX.width)
		expect(label.y + BOX.height).toBeLessThanOrEqual(Math.min(...ys))
	})

	test("puts a box that clears the line nowhere in the band above the plot", () => {
		const flat = [
			{ x: 12, y: 80 },
			{ x: 188, y: 80 },
		]
		const tall: LabelBox = { width: 60, height: 120 }
		const label = placeLabel(flat, PLOT, { x: 100, y: 80 }, tall, "right")
		expect(label.band).toBe(true)
		expect(label.y).toBe(BAND_PAD)
		expect(label.y).toBeLessThan(PLOT.top)
	})

	test("keeps a placed box inside the plot's bounds", () => {
		for (const preferred of [-100, 12, 40, 100, 180, 400]) {
			const box = placeBox(RISING, PLOT, preferred, BOX)
			expect(box.band).toBe(false)
			expect(box.x).toBeGreaterThanOrEqual(PLOT.left)
			expect(box.x + BOX.width).toBeLessThanOrEqual(PLOT.right)
			expect(box.y).toBeGreaterThanOrEqual(PLOT.top)
			expect(box.y + BOX.height).toBeLessThanOrEqual(PLOT.bottom)
		}
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
})

describe("placeBox", () => {
	test("puts a box taller than the plot in the band above it", () => {
		const tall: LabelBox = { width: 40, height: 300 }
		const box = placeBox(RISING, PLOT, 40, tall)
		expect(box.band).toBe(true)
		expect(box.y).toBe(BAND_PAD)
		expect(box.x).toBeGreaterThanOrEqual(PLOT.left)
		expect(box.x + tall.width).toBeLessThanOrEqual(PLOT.right)
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

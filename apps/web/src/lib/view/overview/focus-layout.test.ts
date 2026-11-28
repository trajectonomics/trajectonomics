import { describe, expect, test } from "bun:test"
import type { ChartRow } from "./focus-chart-axis"
import { bandHeight } from "./focus-label-layout"
import { BAND_PAD } from "./focus-label-scan"
import { focusLayout } from "./focus-layout"

/** Three closes, a year apart, rising from zero to 200; the axis ends at the last one. */
const ROWS: ChartRow[] = [
	{ to: "2030-12-31", y: 0 },
	{ to: "2031-12-31", y: 100 },
	{ to: "2032-12-31", y: 200 },
]
const END = "2032-12-31"
const WIDTH = 200
const HEIGHT = 200

describe("focusLayout", () => {
	test("places the box inside the plot when it clears the line there", () => {
		const layout = focusLayout(ROWS, null, END, WIDTH, HEIGHT, { width: 60, height: 20 }, false)
		expect(layout.label.band).toBe(false)
		expect(layout.height).toBe(HEIGHT)
		expect(layout.chart.plot.top).toBe(16)
	})

	test("reserves the band above the plot when the box clears the line nowhere", () => {
		const box = { width: 60, height: 120 }
		const layout = focusLayout(ROWS, null, END, WIDTH, HEIGHT, box, false)
		expect(layout.label.band).toBe(true)
		expect(layout.label.y).toBe(BAND_PAD)
		expect(layout.height).toBe(HEIGHT + bandHeight(box))
		expect(layout.chart.plot.top).toBe(16 + bandHeight(box))
	})
})

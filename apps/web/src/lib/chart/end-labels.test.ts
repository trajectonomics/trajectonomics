import { describe, expect, test } from "bun:test"
import { endLabels } from "./end-labels"
import type { LineLayout, Mark, Plot } from "./layout-types"
import type { LinePoint, LineSeries } from "./line"
import { lineLayout } from "./line-layout"

const PLOT: Plot = { width: 300, height: 200, margin: { top: 12, right: 16, bottom: 28, left: 64 } }

function series(short: string | undefined, last: number): LineSeries {
	const points: LinePoint[] = [
		{ x: 0, xLabel: "2026", y: last, display: String(last) },
		{ x: 1, xLabel: "2027", y: last, display: String(last) },
	]
	return short === undefined ? { name: "A line", points } : { name: "A line", short, points }
}

function layoutOf(lines: readonly LineSeries[]): LineLayout {
	const layout = lineLayout(lines, PLOT)
	if (layout === null) throw new Error("the series have points")
	return layout
}

/** The pixel position of the last mark a series has. */
function lastMark(layout: LineLayout, index: number): Mark {
	const last = [...(layout.series[index]?.marks ?? [])].reverse().find((mark) => mark !== null)
	if (last === undefined || last === null) throw new Error("the series has a point")
	return last
}

describe("endLabels", () => {
	test("names the higher line above its end and the lower line below it, both ending at their x", () => {
		const lines = [series("Future money", 620), series("Today's money", 200)]
		const layout = layoutOf(lines)
		const higher = lastMark(layout, 0)
		const lower = lastMark(layout, 1)
		expect(endLabels(layout, lines, PLOT)).toEqual([
			{ index: 0, text: "Future money", x: higher.x, y: higher.y - 6, anchor: "end" },
			{ index: 1, text: "Today's money", x: lower.x, y: lower.y + 14, anchor: "end" },
		])
	})

	test("keeps the legend when the two lines end closer than 4 pixels apart", () => {
		const lines = [series("Future money", 620), series("Today's money", 620)]
		expect(endLabels(layoutOf(lines), lines, PLOT)).toBeNull()
	})

	test("keeps the legend when a series has no short name", () => {
		const lines = [series("Future money", 620), series(undefined, 200)]
		expect(endLabels(layoutOf(lines), lines, PLOT)).toBeNull()
	})

	test("keeps the legend for a chart of fewer than two series", () => {
		const lines = [series("Future money", 620)]
		expect(endLabels(layoutOf(lines), lines, PLOT)).toBeNull()
	})

	test("keeps the legend when a label would stand closer than 14 pixels to the plot's top", () => {
		const lines = [series("Future money", 1000), series("Today's money", 900)]
		expect(endLabels(layoutOf(lines), lines, PLOT)).toBeNull()
	})
})

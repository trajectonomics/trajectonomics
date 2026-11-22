import { describe, expect, test } from "bun:test"
import { fanOf, fanSeriesName } from "./fan"
import type { LineSeries } from "./line"
import { lineLayout } from "./line-layout"

const MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }

/** One series per percentile, a point at each of two years, rising with the level. */
function series(level: number): LineSeries {
	return {
		name: fanSeriesName(level),
		points: [
			{ x: 0, xLabel: "2026", y: level * 10, display: String(level) },
			{ x: 1, xLabel: "2027", y: level * 20, display: String(level) },
		],
	}
}

const LEVELS = [10, 25, 50, 75, 90]

describe("fanOf", () => {
	test("draws the outer band from the 90th down to the 10th, the inner from the 75th to the 25th, and the median", () => {
		const layout = lineLayout(LEVELS.map(series), { width: 100, height: 100, margin: MARGIN })
		const fan = layout === null ? null : fanOf(layout)
		expect(fan).not.toBeNull()
		// The outer band starts at the 90th Percentile's first point and closes back to the 10th's.
		expect(fan?.outer.startsWith("M")).toBe(true)
		expect(fan?.outer.endsWith("Z")).toBe(true)
		expect(fan?.outer.split("L").length).toBe(4)
		expect(fan?.median.startsWith("M")).toBe(true)
		expect(fan?.median.includes("Z")).toBe(false)
	})

	test("is null when one of the five levels is missing", () => {
		const layout = lineLayout(LEVELS.filter((level) => level !== 75).map(series), {
			width: 100,
			height: 100,
			margin: MARGIN,
		})
		expect(layout).not.toBeNull()
		expect(layout === null ? null : fanOf(layout)).toBeNull()
	})
})

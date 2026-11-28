import { describe, expect, test } from "bun:test"
import { focusChart, labelSide, placeholderPath } from "./focus-chart"
import { type ChartRow, placeRows } from "./focus-chart-paths"

/** Three closes, a year apart, rising from zero to 200; the axis ends at the last one. */
const ROWS: ChartRow[] = [
	{ to: "2030-12-31", y: 0 },
	{ to: "2031-12-31", y: 100 },
	{ to: "2032-12-31", y: 200 },
]
const END = "2032-12-31"
const WIDTH = 200
const HEIGHT = 200

function pixel(value: number): string {
	return String(Number(value.toFixed(2)))
}

describe("focusChart", () => {
	test("puts the first close at the left edge and the last at the right, with zero at the bottom", () => {
		const chart = focusChart(ROWS, null, END, WIDTH, HEIGHT)
		expect(chart.first).toEqual({ x: 12, y: chart.zeroY })
		expect(chart.last?.x).toBe(WIDTH - 12)
		expect(chart.zeroY).toBe(HEIGHT - 56)
	})

	test("finds the stop's x on the date axis and its y between the two rows around the date", () => {
		const plot = { left: 12, right: WIDTH - 12, top: 16, bottom: HEIGHT - 56 }
		const placement = placeRows(ROWS, plot, "2031-06-30", END)
		const [before, after] = placement.points
		const stop = placement.stop
		if (before === undefined || after === undefined || stop === null) {
			throw new Error("the chart has a stop")
		}
		// The dot lies on the segment between the two closes: the two proportions are the same.
		const alongX = (stop.x - before.x) / (after.x - before.x)
		const alongY = (stop.y - before.y) / (after.y - before.y)
		expect(alongX).toBeCloseTo(alongY, 9)
		expect(stop.x).toBeGreaterThan(before.x)
		expect(stop.x).toBeLessThan(after.x)
	})

	test("splits the line and the fill into the two phases at the stop", () => {
		const chart = focusChart(ROWS, "2031-06-30", END, WIDTH, HEIGHT)
		if (chart.stop === null) throw new Error("the chart has a stop")
		const at = `${pixel(chart.stop.x)} ${pixel(chart.stop.y)}`
		expect(chart.foreground.line.endsWith(`L${at}`)).toBe(true)
		expect(chart.foreground.area.endsWith("Z")).toBe(true)
		expect(chart.accent?.line.startsWith(`M${at}`)).toBe(true)
		expect(chart.accent?.area.endsWith("Z")).toBe(true)
	})

	test("puts the label left of a stop past 62% of the width, and right of one before it", () => {
		expect(labelSide(61, 100)).toBe("right")
		expect(labelSide(63, 100)).toBe("left")
		const left = focusChart(ROWS, "2032-12-31", END, WIDTH, HEIGHT)
		expect(left.label?.side).toBe("left")
		const right = focusChart(ROWS, "2030-12-31", END, WIDTH, HEIGHT)
		expect(right.label?.side).toBe("right")
	})

	test("flags the last point, and runs the shortfall bar from the stop to the plan's end", () => {
		const chart = focusChart(ROWS, "2031-06-30", END, WIDTH, HEIGHT)
		expect(chart.flag).toEqual(chart.last)
		if (chart.stop === null || chart.bar === null) throw new Error("the chart has a stop")
		expect(chart.bar).toEqual({
			x: chart.stop.x,
			width: WIDTH - 12 - chart.stop.x,
			y: chart.zeroY + 4,
			height: 10,
		})
	})

	test("draws the whole line in one phase, and no bar, when there is no stop", () => {
		const chart = focusChart(ROWS, null, END, WIDTH, HEIGHT)
		expect(chart.stop).toBeNull()
		expect(chart.accent).toBeNull()
		expect(chart.bar).toBeNull()
		expect(chart.label).toMatchObject({ x: chart.last?.x, y: chart.last?.y, side: "left" })
	})

	test("has no point, no stop and no label without rows", () => {
		const chart = focusChart([], "2031-06-30", null, WIDTH, HEIGHT)
		expect(chart.first).toBeNull()
		expect(chart.last).toBeNull()
		expect(chart.stop).toBeNull()
		expect(chart.label).toBeNull()
		expect(chart.foreground.line).toBe("")
	})

	test("draws a gentle dashed placeholder across the plot", () => {
		const chart = focusChart([], null, null, WIDTH, HEIGHT)
		const path = placeholderPath(chart.plot)
		expect(path.startsWith("M12 ")).toBe(true)
		expect(path).toContain("L188 ")
	})
})

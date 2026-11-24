import { describe, expect, test } from "bun:test"
import { lineLayout, type Plot } from "./line-layout"
import { sparklinePath } from "./sparkline"

const PLOT: Plot = { width: 300, height: 200, margin: { top: 10, right: 10, bottom: 20, left: 50 } }

const net = {
	name: "Net worth",
	points: [
		{ x: 0, xLabel: "Jan 2026", y: 100, display: "100.00" },
		{ x: 1, xLabel: "Feb 2026", y: 300, display: "300.00" },
		{ x: 2, xLabel: "Mar 2026", y: 200, display: "200.00" },
	],
}

describe("lineLayout", () => {
	test("is null for a chart with no points", () => {
		expect(lineLayout([{ name: "none", points: [] }], PLOT)).toBeNull()
	})

	test("starts the y axis at zero and ends it on a nice tick above the largest value", () => {
		const layout = lineLayout([net], PLOT)
		expect(layout?.yTicks[0]?.value).toBe(0)
		expect(layout?.yTicks.at(-1)?.value).toBeGreaterThanOrEqual(300)
	})

	test("places the first x at the left margin and the last at the right", () => {
		const layout = lineLayout([net], PLOT)
		expect(layout?.xPixels[0]).toBe(50)
		expect(layout?.xPixels.at(-1)).toBe(290)
	})

	test("puts the largest value nearest the top of the plot", () => {
		const layout = lineLayout([net], PLOT)
		const marks = layout?.series[0]?.marks ?? []
		const ys = marks.map((mark) => mark?.y ?? Number.NaN)
		expect(ys[1]).toBe(Math.min(...ys))
	})

	test("leaves a gap where a series has no point, and draws the rest", () => {
		const gappy = { name: "b", dashed: true, points: [net.points[0]!, net.points[2]!] }
		const layout = lineLayout([net, gappy], PLOT)
		const marks = layout?.series[1]?.marks
		expect(marks?.[1]).toBeNull()
		expect(layout?.series[1]?.dashed).toBe(true)
		expect(layout?.series[1]?.path.startsWith("M")).toBe(true)
	})

	test("labels a sparse set of x positions and always labels the first", () => {
		const many = Array.from({ length: 24 }, (_, index) => ({
			x: index,
			xLabel: `m${index}`,
			y: index,
			display: String(index),
		}))
		const layout = lineLayout([{ name: "long", points: many }], PLOT)
		expect(layout?.xTicks[0]).toEqual({ index: 0, label: "m0" })
		expect(layout?.xTicks.length).toBeLessThanOrEqual(7)
	})
})

describe("x labels", () => {
	test("a label too close to the one before it is left out, so a part year beside its neighbour stays readable", () => {
		const point = (x: number, label: string) => ({ x, xLabel: label, y: 1, display: "1.00" })
		const layout = lineLayout(
			[{ name: "A", points: [point(0, "30 Oct"), point(10, "31 Dec"), point(400, "30 Oct next")] }],
			PLOT,
		)
		expect(layout?.xTicks.map((tick) => tick.label)).toEqual(["30 Oct", "30 Oct next"])
	})

	test("a chart of many series asks for the wide palette", () => {
		const series = [{ name: "A", points: [{ x: 0, xLabel: "0", y: 1, display: "1.00" }] }]
		expect(lineLayout(series, PLOT, [], "wide")?.palette).toBe("wide")
		expect(lineLayout(series, PLOT)?.palette).toBeUndefined()
	})
})

describe("sparklinePath", () => {
	test("is empty for no values", () => {
		expect(sparklinePath([], 100, 20)).toBe("")
	})

	test("draws a flat value as a straight line through the middle", () => {
		expect(sparklinePath([5, 5], 100, 20)).toBe("M0 10 L100 10")
	})

	test("scales the values to the box, the largest at the top", () => {
		expect(sparklinePath([0, 10], 100, 20)).toBe("M0 20 L100 0")
	})
})

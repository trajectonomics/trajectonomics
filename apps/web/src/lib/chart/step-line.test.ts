import { describe, expect, test } from "bun:test"
import { columnLayout, columnXs } from "./column-layout"
import type { LineSeries } from "./line"
import { withStepLine } from "./step-line"

const plot = { width: 400, height: 240, margin: { top: 12, right: 48, bottom: 28, left: 64 } }
const bars: LineSeries[] = [
	{
		name: "Taxed at 5%",
		points: [
			{ x: 0, xLabel: "Dec 2026", y: 100, display: "100.00" },
			{ x: 1, xLabel: "Dec 2027", y: 200, display: "200.00" },
		],
	},
]
const rate: LineSeries = {
	name: "Top rate",
	points: [
		{ x: 0, xLabel: "Dec 2026", y: 500, display: "5%" },
		{ x: 1, xLabel: "Dec 2027", y: 1000, display: "10%" },
	],
}

function drawn() {
	const base = columnLayout(bars, plot, "stacked-bars")
	if (!base) throw new Error("no layout")
	return withStepLine(
		base,
		{ line: rate, label: (value) => `${value / 100}%` },
		columnXs(bars),
		plot,
	)
}

describe("withStepLine", () => {
	test("adds the line as a plain series after the bars, with a mark in each column", () => {
		const layout = drawn()
		expect(layout.series.map((line) => line.name)).toEqual(["Taxed at 5%", "Top rate"])
		const line = layout.series[1]
		expect(line?.plain).toBe(true)
		expect(line?.marks.map((mark) => mark?.display)).toEqual(["5%", "10%"])
	})

	test("holds each value across its column and steps at the edge between two columns", () => {
		const path = drawn().series[1]?.path ?? ""
		// Two columns of 144 px each, from x = 64: the first holds 64 to 208, the second 208 to 352.
		expect(path.startsWith("M64 ")).toBe(true)
		expect(path).toContain("L208 ")
		expect(path).toContain("L352 ")
	})

	test("labels a second axis on the right, from zero to a tick that covers the largest rate", () => {
		const axis = drawn().rightAxis
		expect(axis?.edge).toBe(352)
		expect(axis?.ticks[0]?.label).toBe("0%")
		expect(axis?.ticks.at(-1)?.label).toBe("10%")
	})

	test("leaves a column with no point without a mark", () => {
		const base = columnLayout(bars, plot, "stacked-bars")
		if (!base) throw new Error("no layout")
		const first = rate.points[0]
		if (!first) throw new Error("no point")
		const gap = withStepLine(
			base,
			{ line: { ...rate, points: [first] }, label: String },
			columnXs(bars),
			plot,
		)
		expect(gap.series[1]?.marks[1]).toBeNull()
	})

	test("puts a flat zero on the baseline, not in the middle of the chart", () => {
		const base = columnLayout(bars, plot, "stacked-bars")
		if (!base) throw new Error("no layout")
		const flat: LineSeries = {
			name: "Top rate",
			points: rate.points.map((point) => ({ ...point, y: 0, display: "0%" })),
		}
		const layout = withStepLine(base, { line: flat, label: String }, columnXs(bars), plot)
		const baseline = plot.height - plot.margin.bottom
		expect(layout.series[1]?.marks.map((mark) => mark?.y)).toEqual([baseline, baseline])
		expect(layout.rightAxis?.ticks).toEqual([{ label: "0", y: baseline }])
	})
})

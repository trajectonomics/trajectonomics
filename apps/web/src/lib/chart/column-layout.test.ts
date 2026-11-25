import { describe, expect, test } from "bun:test"
import { columnLayout } from "./column-layout"
import type { LineSeries } from "./line"
import { stackSpans } from "./stack"

const PLOT = { width: 400, height: 200, margin: { top: 10, right: 10, bottom: 20, left: 40 } }

function line(name: string, values: (number | null)[]): LineSeries {
	return {
		name,
		points: values.flatMap((y, x) =>
			y === null ? [] : [{ x: 2026 + x, xLabel: String(2026 + x), y, display: `${y}.00` }],
		),
	}
}

describe("stackSpans", () => {
	test("stacks positives up and negatives down, and leaves a gap for no value", () => {
		expect(
			stackSpans([
				[1, 2],
				[3, -4],
				[null, 5],
			]),
		).toEqual([
			[
				{ lo: 0, hi: 1 },
				{ lo: 0, hi: 2 },
			],
			[
				{ lo: 1, hi: 4 },
				{ lo: -4, hi: 0 },
			],
			[null, { lo: 2, hi: 7 }],
		])
	})
})

describe("columnLayout", () => {
	test("is null for no points", () => {
		expect(columnLayout([], PLOT, "bars")).toBeNull()
	})

	test("grouped bars sit side by side in a column and keep each series' string", () => {
		const layout = columnLayout([line("A", [10, 20]), line("B", [5, 5])], PLOT, "bars")
		const [a, b] = layout?.series ?? []
		expect(a?.bars?.[0]?.x).toBeLessThan(b?.bars?.[0]?.x ?? 0)
		expect(a?.marks[1]?.display).toBe("20.00")
		expect(layout?.palette).toBe("wide")
		expect(layout?.series[0]?.path).toBe("")
	})

	test("a marker of a bar chart stands inside the column of its period, a fraction of the way along it", () => {
		const bars = [line("A", [10, 20, 30])].map((series) => ({
			...series,
			points: series.points.map((point, index) => ({ ...point, x: index })),
		}))
		const layout = columnLayout(bars, PLOT, "bars", [
			{ x: -0.5, label: "half of the first" },
			{ x: 1, label: "end of the second" },
			{ x: 5, label: "beyond" },
		])
		const [first, second] = layout?.xPixels ?? []
		const slot = ((layout?.xPixels[1] ?? 0) - (first ?? 0)) as number
		expect(layout?.markers.map((marker) => marker.label)).toEqual([
			"half of the first",
			"end of the second",
		])
		expect(layout?.markers[0]?.x).toBeCloseTo(first ?? 0)
		expect(layout?.markers[1]?.x).toBeCloseTo((second ?? 0) + slot / 2)
	})

	test("stacked bars rise from one another and the axis takes in the stack", () => {
		const layout = columnLayout([line("A", [10]), line("B", [10])], PLOT, "stacked-bars")
		const [a, b] = layout?.series ?? []
		const top = a?.bars?.[0]
		const upper = b?.bars?.[0]
		expect(upper?.y).toBeLessThan(top?.y ?? 0)
		expect((upper?.y ?? 0) + (upper?.height ?? 0)).toBeCloseTo(top?.y ?? 0)
		expect(layout?.yTicks.at(-1)?.value).toBeGreaterThanOrEqual(20)
	})

	test("a stacked line is a shaded band per series with a mark per column", () => {
		const layout = columnLayout(
			[line("A", [1, 2, 3]), line("B", [1, 1, null])],
			PLOT,
			"stacked-line",
		)
		expect(layout?.series[0]?.area).toContain("Z")
		expect(layout?.series[1]?.marks[2]).toBeNull()
	})

	test("a column holds only the bars of series that have a value in it, and a part year is faded", () => {
		const lone: LineSeries = {
			name: "Lone",
			points: [{ x: 5, xLabel: "5", y: 10, display: "10.00", partial: true }],
		}
		const layout = columnLayout([line("A", [10]), lone], PLOT, "bars")
		const [a, b] = layout?.series ?? []
		expect(a?.bars).toHaveLength(2)
		const alone = b?.bars?.[0]
		// Two columns of 350px: a bar alone in its column fills it (0.8 of 175), where side by side it would be half that.
		expect(alone?.width).toBeCloseTo(140)
		expect(a?.bars?.[0]).toBeNull()
		expect(alone?.faded).toBe(true)
		expect(a?.bars?.[1]?.faded).toBe(false)
		expect(layout?.xTitles).toEqual(["5", "2026"])
	})
})

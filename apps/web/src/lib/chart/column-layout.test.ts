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
})

import { describe, expect, test } from "bun:test"
import { CHART_WIDTH, chartGeometry } from "./chart"
import { chartReadout, dayAt, keyDay } from "./chart-pointer"
import type { ChartSeries } from "./types"

function line(points: { label: string; tokens: number }[]): ChartSeries {
	return { plan: "claude", name: "Claude", total: 0, points }
}

describe("the day under the pointer", () => {
	test("lands on the day the chart drew", () => {
		const chart = chartGeometry([
			line([
				{ label: "2026-11-24", tokens: 100 },
				{ label: "2026-11-25", tokens: 50 },
				{ label: "2026-11-26", tokens: 0 },
			]),
		])
		const points = chart?.lines[0]?.points ?? []
		for (const [index, point] of points.entries()) {
			expect(dayAt(point.x, points.length)).toBe(index)
		}
	})

	test("clamps a pointer outside the plot", () => {
		expect(dayAt(-20, 10)).toBe(0)
		expect(dayAt(CHART_WIDTH + 40, 10)).toBe(9)
		expect(dayAt(400, 1)).toBe(0)
	})
})

describe("the keyboard probe", () => {
	test("steps across the days and stops at the ends", () => {
		expect(keyDay("ArrowRight", null, 3)).toBe(0)
		expect(keyDay("ArrowRight", 1, 3)).toBe(2)
		expect(keyDay("ArrowRight", 2, 3)).toBe(2)
		expect(keyDay("ArrowLeft", null, 3)).toBe(2)
		expect(keyDay("Home", 2, 3)).toBe(0)
		expect(keyDay("End", 0, 3)).toBe(2)
		expect(keyDay("Enter", 1, 3)).toBeNull()
		expect(keyDay("ArrowRight", 0, 0)).toBeNull()
	})
})

describe("the day readout", () => {
	test("names the day and each plan's compact total", () => {
		expect(
			chartReadout(
				[
					line([{ label: "2026-11-27", tokens: 1500 }]),
					{ name: "OpenCode Go", points: [{ label: "2026-11-27", tokens: 2_000_000 }] },
				],
				0,
			),
		).toBe("2026-11-27: Claude 1.5K · OpenCode Go 2M")
	})

	test("says nothing for a day the series does not have", () => {
		expect(chartReadout([line([{ label: "2026-11-27", tokens: 1 }])], 3)).toBeNull()
	})
})

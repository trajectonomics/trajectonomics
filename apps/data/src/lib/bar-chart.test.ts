import { describe, expect, test } from "bun:test"
import { BAR_HEIGHT, BAR_WIDTH, barGeometry, barMax } from "./bar-chart"
import type { PlanBar } from "./plan-bars"

function bar(overrides: Partial<PlanBar> = {}): PlanBar {
	return {
		plan: "claude",
		planName: "Claude",
		tier: "Max",
		unit: "tokens",
		kind: "estimate",
		tokens: 10,
		low: 5,
		high: 40,
		rough: false,
		derived: false,
		collecting: null,
		...overrides,
	}
}

describe("barGeometry", () => {
	test("has nothing to draw without a plan", () => {
		expect(barGeometry([])).toBeNull()
	})

	test("scales the bars and their whiskers to one rounded maximum", () => {
		const chart = barGeometry([bar(), bar({ plan: "cursor", kind: "fallback", tokens: 20 })])
		if (chart === null) throw new Error("no chart")
		expect(chart.width).toBe(BAR_WIDTH)
		expect(chart.height).toBe(BAR_HEIGHT)
		expect(chart.max).toBe(40)
		expect(chart.bars[0]?.height).toBeCloseTo(71, 6)
		expect(chart.bars[0]?.lowY).toBeCloseTo(292.5, 6)
		expect(chart.bars[0]?.highY).toBeCloseTo(44, 6)
		expect(chart.yTicks.map((tick) => tick.value)).toEqual([40, 32, 24, 16, 8, 0])
	})

	test("gives every bar its own slot", () => {
		const chart = barGeometry([bar(), bar({ plan: "cursor" })])
		if (chart === null) throw new Error("no chart")
		expect(chart.bars[1]?.center).toBeGreaterThan(chart.bars[0]?.center ?? 0)
	})

	test("keeps a collecting window a flat stub at the baseline", () => {
		const chart = barGeometry([
			bar({
				kind: "collecting",
				tokens: null,
				low: null,
				high: null,
				collecting: { seen: 3, of: 7 },
			}),
		])
		if (chart === null) throw new Error("no chart")
		expect(chart.bars[0]?.height).toBe(0)
		expect(chart.bars[0]?.y).toBe(chart.bars[0]?.base)
	})

	test("marks an estimate with no upper bound as open ended", () => {
		const chart = barGeometry([bar({ high: null })])
		if (chart === null) throw new Error("no chart")
		expect(chart.bars[0]?.openHigh).toBe(true)
		expect(chart.bars[0]?.highY).toBeNull()
		expect(chart.bars[0]?.lowY).not.toBeNull()
	})

	test("leaves a most-we-used figure without a whisker", () => {
		const chart = barGeometry([bar({ kind: "fallback", low: null, high: null })])
		if (chart === null) throw new Error("no chart")
		expect(chart.bars[0]?.lowY).toBeNull()
		expect(chart.bars[0]?.openHigh).toBe(false)
	})

	test("writes token ticks in the token unit", () => {
		const chart = barGeometry([bar()])
		if (chart === null) throw new Error("no chart")
		expect(chart.yTicks.map((tick) => tick.label)).toEqual(["40", "32", "24", "16", "8", "0"])
	})

	test("writes dollar ticks in the API $ unit", () => {
		const chart = barGeometry([bar({ unit: "usd", tokens: 1.2, low: 1, high: 1.6 })])
		if (chart === null) throw new Error("no chart")
		expect(chart.max).toBe(2)
		expect(chart.yTicks.map((tick) => tick.label)).toEqual([
			"$2",
			"$1.6",
			"$1.2",
			"$0.8",
			"$0.4",
			"$0",
		])
	})
})

describe("barMax", () => {
	test("keeps a tight round maximum above the largest bar", () => {
		expect(barMax(110_000_000)).toBe(125_000_000)
		expect(barMax(100_000_000)).toBe(100_000_000)
		expect(barMax(54_000_000)).toBe(60_000_000)
	})

	test("has a one-unit scale for an empty chart", () => {
		expect(barMax(0)).toBe(1)
	})
})

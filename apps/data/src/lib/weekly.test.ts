import { describe, expect, test } from "bun:test"
import type { PlanBar } from "./plan-bars"
import { weeklyFigures } from "./weekly"

function bar(overrides: Partial<PlanBar> = {}): PlanBar {
	return {
		plan: "claude",
		planName: "Claude",
		tier: "Max",
		unit: "tokens",
		kind: "estimate",
		tokens: 100,
		low: 90,
		high: 110,
		rough: false,
		derived: false,
		collecting: null,
		...overrides,
	}
}

describe("weeklyFigures", () => {
	test("keeps plans with an estimate or a most-we-used figure", () => {
		const figures = weeklyFigures(
			[bar(), bar({ plan: "cursor", planName: "Cursor", kind: "fallback", tokens: 50 })],
			[],
		)
		expect(figures.map((figure) => figure.plan)).toEqual(["claude", "cursor"])
		expect(figures.map((figure) => figure.monthCapped)).toEqual([false, false])
	})

	test("leaves out a plan whose week is still collecting", () => {
		const figures = weeklyFigures(
			[bar({ kind: "collecting", tokens: null, collecting: { seen: 3, of: 7 } })],
			[],
		)
		expect(figures).toEqual([])
	})

	test("leaves out a plan with no figure", () => {
		expect(weeklyFigures([bar({ kind: "none", tokens: null })], [])).toEqual([])
	})

	test("caps a plan's week at its monthly allowance per week", () => {
		const plan = { plan: "opencode-go", planName: "OpenCode Go", tier: "Go" }
		const figures = weeklyFigures(
			[bar({ ...plan, tokens: 107, low: 100, high: 114 })],
			[bar({ ...plan, tokens: 222, low: 210, high: 234 })],
		)
		expect(figures[0]?.tokens).toBeCloseTo(51.8, 6)
		expect(figures[0]?.low).toBeCloseTo(49, 6)
		expect(figures[0]?.high).toBeCloseTo(54.6, 6)
		expect(figures[0]?.kind).toBe("estimate")
		expect(figures[0]?.monthCapped).toBe(true)
	})

	test("marks a capped most-we-used week as an estimate", () => {
		const plan = { plan: "opencode-go", planName: "OpenCode Go", tier: "Go" }
		const figures = weeklyFigures(
			[bar({ ...plan, kind: "fallback", tokens: 107 })],
			[bar({ ...plan, tokens: 222 })],
		)
		expect(figures[0]?.kind).toBe("estimate")
		expect(figures[0]?.monthCapped).toBe(true)
	})

	test("leaves the week alone when the monthly allowance allows at least the week", () => {
		const plan = { plan: "opencode-go", planName: "OpenCode Go", tier: "Go" }
		const figures = weeklyFigures([bar({ ...plan })], [bar({ ...plan, tokens: 500 })])
		expect(figures[0]?.tokens).toBe(100)
		expect(figures[0]?.low).toBe(90)
		expect(figures[0]?.high).toBe(110)
		expect(figures[0]?.monthCapped).toBe(false)
	})

	test("never caps a plan whose 30-day figure is just the week × 30/7", () => {
		const figures = weeklyFigures([bar()], [bar({ tokens: 50 })])
		expect(figures[0]?.tokens).toBe(100)
		expect(figures[0]?.kind).toBe("estimate")
		expect(figures[0]?.monthCapped).toBe(false)
	})

	test("never caps by a most-we-used, collecting or empty month", () => {
		const plan = { plan: "opencode-go", planName: "OpenCode Go", tier: "Go" }
		const months = [
			bar({ ...plan, kind: "fallback", tokens: 50 }),
			bar({ ...plan, kind: "collecting", tokens: null, collecting: { seen: 3, of: 30 } }),
			bar({ ...plan, kind: "none", tokens: null }),
		]
		for (const month of months) {
			const figures = weeklyFigures([bar({ ...plan, tokens: 107 })], [month])
			expect(figures[0]?.tokens).toBe(107)
			expect(figures[0]?.kind).toBe("estimate")
			expect(figures[0]?.monthCapped).toBe(false)
		}
	})

	test("leaves the week alone when the plan has no month bar", () => {
		const plan = { plan: "opencode-go", planName: "OpenCode Go", tier: "Go" }
		const figures = weeklyFigures([bar({ ...plan, tokens: 107 })], [])
		expect(figures[0]?.tokens).toBe(107)
		expect(figures[0]?.monthCapped).toBe(false)
	})
})

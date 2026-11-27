import { describe, expect, test } from "bun:test"
import type { PlanBar } from "./plan-bars"
import { weeklyFigures } from "./weekly"

function bar(overrides: Partial<PlanBar> = {}): PlanBar {
	return {
		plan: "claude",
		planName: "Claude",
		tier: "Max",
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
		const figures = weeklyFigures([
			bar(),
			bar({ plan: "cursor", planName: "Cursor", kind: "fallback", tokens: 50 }),
		])
		expect(figures.map((figure) => figure.plan)).toEqual(["claude", "cursor"])
	})

	test("leaves out a plan whose week is still collecting", () => {
		const figures = weeklyFigures([
			bar({ kind: "collecting", tokens: null, collecting: { seen: 3, of: 7 } }),
		])
		expect(figures).toEqual([])
	})

	test("leaves out a plan with no figure", () => {
		expect(weeklyFigures([bar({ kind: "none", tokens: null })])).toEqual([])
	})
})

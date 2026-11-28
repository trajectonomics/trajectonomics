import { describe, expect, test } from "bun:test"
import type { CachePlanRow } from "./cache-rate"
import type { PlanBar } from "./plan-bars"
import { cacheTakeaway, planTakeaway, valueTakeaway } from "./takeaways"
import type { ValuePoint } from "./value-points"

function bar(overrides: Partial<PlanBar> = {}): PlanBar {
	return {
		plan: "opencode-go",
		planName: "OpenCode Go",
		tier: "Go",
		unit: "tokens",
		kind: "estimate",
		tokens: 86_000_000,
		low: 80_000_000,
		high: 92_000_000,
		rough: false,
		derived: false,
		collecting: null,
		...overrides,
	}
}

function point(overrides: Partial<ValuePoint> = {}): ValuePoint {
	return {
		key: "claude",
		label: "Claude",
		plan: "claude",
		x: 2.1,
		y: 100,
		hollow: false,
		weekly: 1,
		tokensPerDollar: 100,
		apiValuePerDollar: 2.1,
		...overrides,
	}
}

function cacheRow(overrides: Partial<CachePlanRow> = {}): CachePlanRow {
	return {
		plan: "claude",
		planName: "Claude",
		tokensIn: 1,
		tokensOut: 1,
		cacheRead: 9,
		cacheWrite: 0,
		tokensTotal: 11,
		rate: 0.9,
		models: [],
		...overrides,
	}
}

describe("planTakeaway", () => {
	test("names the leader of the week with its estimated 100%", () => {
		expect(
			planTakeaway([bar(), bar({ plan: "claude", planName: "Claude", tokens: 50 })], "sevenDays"),
		).toBe("OpenCode Go: ≈ 86M a week at 100%")
	})

	test("names the with-cache unit", () => {
		expect(planTakeaway([bar({ unit: "processed" })], "sevenDays", "processed")).toBe(
			"OpenCode Go: ≈ 86M a week with cache at 100%",
		)
	})

	test("names the API $ unit in dollars", () => {
		expect(planTakeaway([bar({ unit: "usd", tokens: 1_300 })], "sevenDays", "usd")).toBe(
			"OpenCode Go: ≈ $1.3K API a week at 100%",
		)
	})

	test("calls a most-we-used figure what it is", () => {
		expect(planTakeaway([bar({ kind: "fallback", high: null })], "sevenDays")).toBe(
			"OpenCode Go: 86M a week, most we used",
		)
	})

	test("marks a rough estimate", () => {
		expect(planTakeaway([bar({ rough: true })], "fiveHours")).toContain("(rough)")
	})

	test("names the selected window", () => {
		expect(planTakeaway([bar()], "thirtyDays")).toContain("in 30 days")
	})

	test("says so when nothing has a figure", () => {
		expect(planTakeaway([bar({ kind: "collecting", tokens: null })], "sevenDays")).toBe(
			"No plan has a full window yet.",
		)
		expect(planTakeaway([bar({ kind: "none", tokens: null })], "sevenDays", "usd")).toBe(
			"No plan has an API $ figure yet.",
		)
	})
})

describe("valueTakeaway", () => {
	test("names the plan with the most API value per dollar", () => {
		expect(valueTakeaway([point(), point({ key: "cursor", label: "Cursor", x: 0.8 })])).toBe(
			"Claude: $2.10 API value per $1",
		)
	})

	test("says when the leader's figure is only the most we used", () => {
		expect(valueTakeaway([point({ hollow: true })])).toBe(
			"Claude: $2.10 API value per $1, most we used",
		)
	})

	test("says so when no plan has a dot", () => {
		expect(valueTakeaway([])).toBe("No plan has both a weekly figure and a price yet.")
	})
})

describe("cacheTakeaway", () => {
	test("names the highest cache rate", () => {
		expect(
			cacheTakeaway([cacheRow({ rate: 0.94 }), cacheRow({ plan: "cursor", planName: "Cursor" })]),
		).toBe("Claude: 94% from cache")
	})

	test("says so when no plan reports a split", () => {
		expect(cacheTakeaway([cacheRow({ rate: null })])).toBe("No plan reports a cache split yet.")
	})
})

import { describe, expect, test } from "bun:test"
import { matchPlan, type PlanTier, plans, tierOn, tierRangeOn } from "../src/plans"

describe("matchPlan", () => {
	test("matches provider ids before model prefixes", () => {
		expect(matchPlan("opencode-go", "deepseek-v4.1-flash")).toBe("opencode-go")
		expect(matchPlan("opencode", "deepseek-v4.1-flash")).toBe("opencode-free")
		expect(matchPlan("commandcode", "deepseek/deepseek-v4.1-flash")).toBe("command-code")
		expect(matchPlan("command-code", "anything")).toBe("command-code")
		expect(matchPlan("muse", "muse-ember-1.0")).toBe("meta")
		expect(matchPlan("cursor", "grok-4.7")).toBe("cursor")
		expect(matchPlan("mistral", "mistral-large-4")).toBe("mistral")
	})

	test("falls back to a model prefix when the provider is unknown", () => {
		expect(matchPlan(null, "claude-opus-5-5")).toBe("claude")
		expect(matchPlan(undefined, "gemini-4-hydrogen-high")).toBe("antigravity")
		expect(matchPlan("other", "muse-wonder-1.0")).toBe("meta")
	})

	test("returns unknown instead of inventing a plan", () => {
		expect(matchPlan("other", "other-model")).toBe("unknown")
	})

	test("plan ids are unique and prices are absent", () => {
		const ids = plans.map((plan) => plan.id)
		expect(new Set(ids).size).toBe(ids.length)
		expect(JSON.stringify(plans)).not.toContain("price")
	})
})

/** A tier written by hand; the bounds are what the test is about, never a real tier date. */
function tier(from: string | null, to: string | null): PlanTier {
	return { name: "Test tier", from, to, source: "hand-kept" }
}

/** Both ends as concrete days, so an open end compares against everything. */
function bounds(entry: PlanTier): { from: string; to: string } {
	return { from: entry.from ?? "0000-01-01", to: entry.to ?? "9999-12-31" }
}

function overlaps(first: PlanTier, second: PlanTier): boolean {
	const a = bounds(first)
	const b = bounds(second)
	return a.from <= b.to && b.from <= a.to
}

/** Every unordered pair of a list, for a disjointness check. */
function pairs<T>(items: readonly T[]): (readonly [T, T])[] {
	const result: (readonly [T, T])[] = []
	for (let first = 0; first < items.length; first += 1) {
		for (let second = first + 1; second < items.length; second += 1) {
			const a = items[first]
			const b = items[second]
			if (a !== undefined && b !== undefined) result.push([a, b])
		}
	}
	return result
}

describe("the plan table's tier history", () => {
	test("orders every tier's bounds", () => {
		for (const plan of plans) {
			for (const entry of plan.tiers) {
				if (entry.from !== null && entry.to !== null) {
					expect(entry.from <= entry.to).toBe(true)
				}
			}
		}
	})

	test("keeps one plan's tiers apart", () => {
		for (const plan of plans) {
			for (const [first, second] of pairs(plan.tiers)) {
				expect(overlaps(first, second)).toBe(false)
			}
		}
	})

	test("gives every known plan a tier, except the one we cannot name", () => {
		for (const plan of plans) {
			if (plan.id === "meta") expect(plan.tiers).toEqual([])
			else expect(plan.tiers.length).toBe(1)
		}
	})
})

describe("tierOn", () => {
	test("reads the tier a plan ran on that day", () => {
		expect(tierOn("claude", "2026-11-24")?.name).toBe("Max 5x")
		expect(tierOn("antigravity", "2026-11-24")?.name).toBe("Google AI Pro")
		expect(tierOn("mistral", "2026-11-21")?.name).toBe("Pro")
	})

	test("treats a null bound as open-ended", () => {
		expect(tierOn("claude", "2026-10-17")?.name).toBe("Max 5x")
		expect(tierOn("claude", "2099-01-01")?.name).toBe("Max 5x")
		expect(tierOn("antigravity", "2020-01-01")?.name).toBe("Google AI Pro")
	})

	test("answers null before the tier starts", () => {
		expect(tierOn("claude", "2026-10-16")).toBeNull()
	})

	test("answers null for a plan with no tier and for a plan the table does not name", () => {
		expect(tierOn("meta", "2026-11-24")).toBeNull()
		expect(tierOn("unknown", "2026-11-24")).toBeNull()
		expect(tierOn("nope", "2026-11-24")).toBeNull()
	})

	test("names the source of every tier", () => {
		expect(tierOn("claude", "2026-11-24")?.source).toBe("vendor")
		expect(tierOn("antigravity", "2026-11-24")?.source).toBe("hand-kept")
	})
})

describe("tierRangeOn", () => {
	test("includes both ends of a closed range", () => {
		const tiers = [tier("2026-01-01", "2026-01-31")]
		expect(tierRangeOn(tiers, "2026-01-01")?.name).toBe("Test tier")
		expect(tierRangeOn(tiers, "2026-01-31")?.name).toBe("Test tier")
		expect(tierRangeOn(tiers, "2025-12-31")).toBeNull()
		expect(tierRangeOn(tiers, "2026-02-01")).toBeNull()
	})

	test("leaves both ends open when they are null", () => {
		const tiers = [tier(null, null)]
		expect(tierRangeOn(tiers, "1999-01-01")).not.toBeNull()
		expect(tierRangeOn(tiers, "2099-12-31")).not.toBeNull()
	})

	test("picks the only tier that covers the day", () => {
		const tiers = [tier("2026-01-01", "2026-01-31"), tier("2026-03-01", null)]
		expect(tierRangeOn(tiers, "2026-02-10")).toBeNull()
		expect(tierRangeOn(tiers, "2026-04-10")?.from).toBe("2026-03-01")
	})

	test("answers null when the history is empty", () => {
		expect(tierRangeOn([], "2026-11-24")).toBeNull()
	})
})

import { describe, expect, test } from "bun:test"
import { MONTH_FROM_WEEK, monthPeak, monthTier } from "./plan-month"
import type { Peak } from "./types"

function peak(tokens: number, cacheRead: number | null = null): Peak {
	return { tokens, fromDay: "2026-11-24", cacheRead }
}

describe("a month from a week", () => {
	test("names the plans whose vendor states no monthly window", () => {
		expect([...MONTH_FROM_WEEK].sort()).toEqual(["antigravity", "claude"])
	})

	test("scales Claude's week to 30 days, cutting the figure toward zero", () => {
		expect(monthPeak("claude", peak(1_000, 9_000), peak(50_000))).toEqual({
			tokens: 4_285,
			fromDay: "2026-11-24",
			cacheRead: 38_571,
			derived: true,
		})
	})

	test("scales Antigravity's week too", () => {
		expect(monthPeak("antigravity", peak(700), null)?.tokens).toBe(3_000)
	})

	test("keeps a measured month when the vendor states one", () => {
		expect(monthPeak("cursor", peak(1_000), peak(9_000))).toEqual(peak(9_000))
	})

	test("has no month for a plan with no week to scale", () => {
		expect(monthPeak("claude", null, peak(9_000))).toBeNull()
	})

	test("derives each measured tier's month from its own week", () => {
		const tier = monthTier("claude", {
			tier: "Max",
			fiveHours: peak(100),
			sevenDays: peak(700),
			thirtyDays: peak(1_000),
		})
		expect(tier.thirtyDays).toEqual({
			tokens: 3_000,
			fromDay: "2026-11-24",
			cacheRead: null,
			derived: true,
		})
	})
})

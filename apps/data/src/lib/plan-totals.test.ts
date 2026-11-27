import { describe, expect, test } from "bun:test"
import { grandTotal } from "./grand-total"
import { planNote, planTotals } from "./plan-totals"
import type { UsageRow } from "./types"

const TO = "2026-11-27"

function row(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		day: "2026-11-24",
		plan: "claude",
		model: "claude-opus-5-5",
		tokensIn: 10,
		tokensOut: 20,
		cacheRead: 30,
		cacheWrite: 40,
		tokensTotal: 100,
		requests: 1,
		granularity: "hour",
		bestEffort: false,
		...overrides,
	}
}

function find(totals: ReturnType<typeof planTotals>, plan: string) {
	return totals.find((entry) => entry.plan === plan)
}

describe("the plan totals", () => {
	test("counts only days with tokens as active, across a day's models", () => {
		const totals = planTotals(
			[
				row({ day: "2026-11-24", model: "a", tokensTotal: 100 }),
				row({ day: "2026-11-24", model: "b", tokensTotal: 50 }),
				row({ day: "2026-11-25", model: "a", tokensTotal: 0 }),
				row({ day: "2026-11-26", model: "a", tokensTotal: 20 }),
			],
			TO,
		)
		expect(find(totals, "claude")).toMatchObject({
			planName: "Claude",
			activeDays: 2,
			tokensTotal: 170,
			requests: 4,
			tokensPerActiveDay: 85,
			lastDay: "2026-11-26",
		})
	})

	test("finds the busiest day by its model sums, the earliest on a tie", () => {
		const totals = planTotals(
			[
				row({ day: "2026-11-24", model: "a", tokensTotal: 60 }),
				row({ day: "2026-11-24", model: "b", tokensTotal: 40 }),
				row({ day: "2026-11-25", model: "a", tokensTotal: 100 }),
				row({ day: "2026-11-23", model: "a", tokensTotal: 90 }),
			],
			TO,
		)
		expect(find(totals, "claude")?.busiestDay).toEqual({ day: "2026-11-24", tokens: 100 })
	})

	test("has no busiest day or last day when every row is zero", () => {
		const totals = planTotals([row({ tokensTotal: 0 })], TO)
		expect(find(totals, "claude")).toMatchObject({
			activeDays: 0,
			tokensPerActiveDay: 0,
			busiestDay: null,
			lastDay: null,
			inUse: false,
		})
	})

	test("marks a plan in use at exactly seven days before the window end", () => {
		const totals = planTotals(
			[
				row({ plan: "claude", day: "2026-11-20" }),
				row({ plan: "mistral", model: "mistral-large", day: "2026-11-19" }),
			],
			TO,
		)
		expect(find(totals, "claude")?.inUse).toBe(true)
		expect(find(totals, "mistral")?.inUse).toBe(false)
	})

	test("sums a plan's reported breakdown and leaves Mistral's unreported parts null", () => {
		const totals = planTotals(
			[
				row({ tokensTotal: 100, tokensIn: 10, tokensOut: 20, cacheRead: 30, cacheWrite: 40 }),
				row({
					day: "2026-11-25",
					tokensTotal: 100,
					tokensIn: 5,
					tokensOut: 5,
					cacheRead: 20,
					cacheWrite: 0,
				}),
				row({
					plan: "mistral",
					model: "mistral-large",
					tokensTotal: 50,
					tokensIn: null,
					tokensOut: null,
					cacheRead: null,
					cacheWrite: null,
				}),
			],
			TO,
		)
		const claude = find(totals, "claude")
		const mistral = find(totals, "mistral")
		expect(claude).toMatchObject({ tokensIn: 15, tokensOut: 25, cacheRead: 50, cacheWrite: 40 })
		expect(mistral).toMatchObject({
			tokensIn: null,
			tokensOut: null,
			cacheRead: null,
			cacheWrite: null,
			cacheShare: null,
		})
	})

	test("divides cache reads by total tokens over the rows that report them", () => {
		const totals = planTotals(
			[
				row({ tokensTotal: 100, cacheRead: 30 }),
				row({ day: "2026-11-25", tokensTotal: 100, cacheRead: 20 }),
			],
			TO,
		)
		expect(find(totals, "claude")?.cacheShare).toBe(0.25)
	})

	test("ranks plans by tokens per active day, then by the plan table", () => {
		const totals = planTotals(
			[
				row({ plan: "claude", day: "2026-11-24", tokensTotal: 150 }),
				row({ plan: "claude", day: "2026-11-25", tokensTotal: 150 }),
				row({ plan: "mistral", model: "mistral-large", tokensTotal: 200 }),
				row({ plan: "antigravity", model: "gemini-4", day: "2026-11-24", tokensTotal: 50 }),
				row({ plan: "antigravity", model: "gemini-4", day: "2026-11-25", tokensTotal: 50 }),
			],
			TO,
		)
		expect(totals.map((total) => total.plan)).toEqual(["mistral", "claude", "antigravity"])
	})

	test("breaks a tied rate with the plan table's order", () => {
		const totals = planTotals(
			[row({ plan: "mistral", model: "mistral-large" }), row({ plan: "claude" })],
			TO,
		)
		expect(totals.map((total) => total.plan)).toEqual(["claude", "mistral"])
	})

	test("has no totals for no rows", () => {
		expect(planTotals([], TO)).toEqual([])
	})
})

describe("the grand total", () => {
	test("adds every plan's tokens, requests and reported parts", () => {
		const totals = planTotals(
			[
				row({ plan: "claude", tokensTotal: 75, requests: 3, tokensIn: 10 }),
				row({
					plan: "mistral",
					model: "mistral-large",
					tokensTotal: 25,
					requests: 2,
					tokensIn: null,
					tokensOut: null,
					cacheRead: null,
					cacheWrite: null,
				}),
			],
			TO,
		)
		expect(grandTotal(totals)).toEqual({
			tokensTotal: 100,
			requests: 5,
			activeDays: 2,
			tokensIn: 10,
			tokensOut: 20,
			cacheRead: 30,
			cacheWrite: 40,
		})
	})
})

describe("a plan's source note", () => {
	test("is absent for hourly, exact rows", () => {
		expect(planNote({ daily: false, bestEffort: false })).toBeNull()
	})

	test("says the plan includes a daily export when one row is daily and another hourly", () => {
		const [mistral] = planTotals(
			[
				row({ plan: "mistral", model: "mistral-large", granularity: "day" }),
				row({ day: "2026-11-25", plan: "mistral", model: "mistral-large", granularity: "hour" }),
			],
			TO,
		)
		expect(mistral === undefined ? null : planNote(mistral)).toBe("includes a daily export")
	})

	test("names both sources when both apply", () => {
		expect(planNote({ daily: true, bestEffort: true })).toBe(
			"includes a daily export · includes a best-effort source",
		)
	})
})

import { describe, expect, test } from "bun:test"
import { grandTotal, planNote, planTotals } from "./plan-totals"
import type { UsageRow } from "./types"

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

describe("the plan totals", () => {
	test("groups one plan across days and models", () => {
		const totals = planTotals([
			row(),
			row({ day: "2026-11-25", model: "claude-sonnet-5-5", tokensTotal: 50, requests: 2 }),
			row({ plan: "mistral", model: "mistral-large", tokensTotal: 25 }),
		])
		const claude = totals.find((entry) => entry.plan === "claude")
		expect(claude).toMatchObject({
			planName: "Claude",
			tokensTotal: 150,
			requests: 3,
			models: 2,
		})
	})

	test("counts distinct models", () => {
		const totals = planTotals([
			row({ model: "claude-opus-5-5" }),
			row({ day: "2026-11-25", model: "claude-opus-5-5" }),
			row({ model: "claude-sonnet-5-5" }),
		])
		expect(totals[0]?.models).toBe(2)
	})

	test("gives each plan its share of the grand total", () => {
		const totals = planTotals([
			row({ plan: "claude", tokensTotal: 75 }),
			row({ plan: "mistral", model: "mistral-large", tokensTotal: 25 }),
		])
		expect(totals.reduce((sum, total) => sum + total.share, 0)).toBe(1)
		expect(totals.map((total) => total.share)).toEqual([0.75, 0.25])
	})

	test("gives every plan a zero share when the grand total is zero", () => {
		const totals = planTotals([
			row({ plan: "claude", tokensTotal: 0 }),
			row({ plan: "mistral", model: "mistral-large", tokensTotal: 0 }),
		])
		expect(totals.map((total) => total.share)).toEqual([0, 0])
	})

	test("orders plans by the plan table, then by id", () => {
		const totals = planTotals([
			row({ plan: "mistral", model: "mistral-large" }),
			row({ plan: "claude" }),
			row({ plan: "zzz", model: "unknown-model" }),
			row({ plan: "aaa", model: "unknown-model" }),
		])
		expect(totals.map((total) => total.plan)).toEqual(["claude", "mistral", "aaa", "zzz"])
	})

	test("marks a daily export and a best-effort source", () => {
		const totals = planTotals([
			row({ plan: "mistral", model: "mistral-large", granularity: "day" }),
			row({ plan: "meta", model: "muse-spark", bestEffort: true }),
		])
		const mistral = totals.find((entry) => entry.plan === "mistral")
		const meta = totals.find((entry) => entry.plan === "meta")
		expect(mistral === undefined ? null : mistral.daily).toBe(true)
		expect(mistral === undefined ? null : mistral.bestEffort).toBe(false)
		expect(meta === undefined ? null : meta.daily).toBe(false)
		expect(meta === undefined ? null : meta.bestEffort).toBe(true)
	})

	test("has no totals for no rows", () => {
		expect(planTotals([])).toEqual([])
	})
})

describe("the grand total", () => {
	test("adds every plan's tokens and requests", () => {
		const totals = planTotals([
			row({ plan: "claude", tokensTotal: 75, requests: 3 }),
			row({ plan: "mistral", model: "mistral-large", tokensTotal: 25, requests: 2 }),
		])
		expect(grandTotal(totals)).toEqual({ tokensTotal: 100, requests: 5, share: 1 })
	})

	test("is zero, with a zero share, for no plans", () => {
		expect(grandTotal([])).toEqual({ tokensTotal: 0, requests: 0, share: 0 })
	})

	test("has a zero share when every plan has zero tokens", () => {
		expect(grandTotal(planTotals([row({ tokensTotal: 0, requests: 2 })]))).toEqual({
			tokensTotal: 0,
			requests: 2,
			share: 0,
		})
	})
})

describe("a plan's source note", () => {
	test("is absent for hourly, exact rows", () => {
		expect(planNote({ daily: false, bestEffort: false })).toBeNull()
	})

	test("says the plan includes a daily export when one row is daily and another hourly", () => {
		const [mistral] = planTotals([
			row({ plan: "mistral", model: "mistral-large", granularity: "day" }),
			row({ day: "2026-11-25", plan: "mistral", model: "mistral-large", granularity: "hour" }),
		])
		expect(mistral === undefined ? null : planNote(mistral)).toBe("includes a daily export")
	})

	test("names both sources when both apply", () => {
		expect(planNote({ daily: true, bestEffort: true })).toBe(
			"includes a daily export · includes a best-effort source",
		)
	})
})

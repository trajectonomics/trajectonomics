import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import { ruledExpense } from "../engine/test-rules"
import type { Milestone } from "../types"
import { firedOn, milestonedResult } from "./test-milestones"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const rule = { kind: "initialRate", portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const

/** Retire once net worth is 25 times the next 12 months of expenses. */
const retire: Milestone = {
	id: "retire",
	combine: "all",
	criteria: [
		{
			id: "enough",
			kind: "multiple",
			metric: "netWorth",
			op: "atLeast",
			base: { expenses: "next12Months" },
			num: 25,
			den: 1,
			terms: "nominal",
		},
	],
}

const plan = (spending: Setup["flows"]): Setup => ({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "inv", kind: "asset", rate: 0 },
	],
	balances: { cash: 1_000_000, inv: 40_000_000 },
	flows: [
		income("salary", 800_000, monthly),
		expense("living", 150_000, { ...monthly, endAt: "retire" }),
		...(spending ?? []),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash", "inv"],
	start: "2026-01-01",
	horizon: "2028-01-01",
	resolution: "month",
})

describe("a next-12-months Milestone beside a rule Flow that starts at that Milestone", () => {
	// Net worth is 41,000,000 and grows by 800,000 − 150,000 a month. Until `retire` fires the window
	// holds twelve livings (1,800,000) and the rule Flow, which has not started, adds nothing: the
	// goal is 25 × 1,800,000 = 45,000,000. Six months give 44,900,000 on 2026-07-01, seven give
	// 45,550,000 on 2026-08-01, which is when it fires.
	it("is accepted, and its window prices only the pre-retirement expenses", () => {
		const gated = ruledExpense("spending", rule, { ...monthly, startAt: "retire" })
		const result = milestonedResult(plan([gated]), [retire])
		expect(result.ok).toBe(true)
		if (result.ok) expect(firedOn(result.projection, "retire")).toBe("2026-08-01")
	})

	it("is refused when the rule Flow has no gate, or one on another Milestone", () => {
		for (const spending of [
			ruledExpense("spending", rule, monthly),
			ruledExpense("spending", rule, { ...monthly, startAt: "other" }),
		]) {
			const other: Milestone = { ...retire, id: "other" }
			const result = milestonedResult(plan([spending]), [retire, other])
			expect(result.ok).toBe(false)
			if (!result.ok)
				expect(result.problems.map((item) => item.code)).toContain("NEXT_12_MONTHS_READS_ACCOUNT")
		}
	})
})

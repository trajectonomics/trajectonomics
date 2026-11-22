import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import type { Milestone } from "../types"
import { firedOn, milestoned, milestonedResult } from "./test-milestones"

const cash = { id: "cash", kind: "asset", rate: 0 } as const
const base = {
	accounts: [cash],
	balances: { cash: 0 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
} as const satisfies Setup

/** A Milestone of one criterion. */
function one(id: string, criterion: Milestone["criteria"][number]): Milestone {
	return { id, combine: "all", criteria: [criterion] }
}

describe("a metric Milestone fires on the first evaluation date its metric holds", () => {
	it("fires on the 1 Apr when opening net worth first reaches 3,500", () => {
		// Cash opens at 1,000 and gains 1,000 on each 1st. Opening net worth on 1 Apr is 4,000
		// (1 Jan, 1 Feb, 1 Mar all landed), and on 1 Mar it is 3,000.
		const projection = milestoned(
			{
				...base,
				balances: { cash: 1000 },
				flows: [income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })],
				start: "2026-01-01",
				horizon: "2026-12-31",
			},
			[
				one("rich", {
					id: "c",
					kind: "metric",
					metric: "netWorth",
					op: "atLeast",
					amount: 3500,
					terms: "nominal",
				}),
			],
		)
		expect(firedOn(projection, "rich")).toBe("2026-04-01")
		expect(projection.milestones).toEqual([{ id: "rich", reached: true, date: "2026-04-01" }])
	})

	it("fires on the 1 Jan of the 25th year for 25 × next-12-month expenses", () => {
		// Income 2,000 and expense 1,000 on each 1st: cash grows 1,000 a month from zero. Next 12
		// months of expenses are 12,000, so 25 × 12,000 = 300,000, which opening cash reaches after
		// 300 months: 1 Jan 2051. On 1 Dec 2050 cash is 299,000.
		const projection = milestoned(
			{
				...base,
				flows: [
					income("salary", 2000, { frequency: "monthly", start: "2026-01-01" }),
					expense("rent", 1000, { frequency: "monthly", start: "2026-01-01" }),
				],
				start: "2026-01-01",
				horizon: "2052-01-01",
				resolution: "month",
			},
			[
				one("fi", {
					id: "c",
					kind: "multiple",
					metric: "unlockedAssets",
					op: "atLeast",
					base: { expenses: "next12Months" },
					num: 25,
					den: 1,
					terms: "nominal",
				}),
			],
		)
		expect(firedOn(projection, "fi")).toBe("2051-01-01")
	})

	it("fires on the 1 Jan after a year of trailing expenses, and never while the window is partial", () => {
		// Rent 1,000 on each 1st from 1 Jan 2026. The trailing window ending 1 Jan 2027 is complete
		// and holds 12 expenses, 12,000. Earlier windows reach before the Timeline start: partial.
		const rent = expense("rent", 1000, { frequency: "monthly", start: "2026-01-01" })
		const setup = {
			...base,
			balances: { cash: 50000 },
			flows: [rent],
			start: "2026-01-01",
			horizon: "2027-06-01",
		} as const
		const trailing = (amount: number): Milestone[] => [
			one("spent", {
				id: "c",
				kind: "metric",
				metric: { expenses: "trailing12Months" },
				op: "atLeast",
				amount,
				terms: "nominal",
			}),
		]
		expect(firedOn(milestoned(setup, trailing(12000)), "spent")).toBe("2027-01-01")
		expect(milestoned(setup, trailing(12001)).milestones).toEqual([{ id: "spent", reached: false }])
	})

	it("fires an 'at' criterion on the same day, and an 'after N months' one N months later", () => {
		const setup = {
			...base,
			balances: { cash: 1000 },
			flows: [income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })],
			start: "2026-01-01",
			horizon: "2026-12-31",
		} as const
		const rich = one("rich", {
			id: "c",
			kind: "metric",
			metric: "netWorth",
			op: "atLeast",
			amount: 3500,
			terms: "nominal",
		})
		const at = one("same", { id: "c", kind: "milestone", milestone: "rich", months: 0 })
		const after = one("later", { id: "c", kind: "milestone", milestone: "rich", months: 1 })
		const projection = milestoned(setup, [rich, at, after])
		expect(firedOn(projection, "same")).toBe("2026-04-01")
		expect(firedOn(projection, "later")).toBe("2026-05-01")
	})

	it("reports a Milestone that never holds as reached false", () => {
		const result = milestonedResult(
			{ ...base, flows: [], start: "2026-01-01", horizon: "2026-06-01" },
			[
				one("never", {
					id: "c",
					kind: "metric",
					metric: "netWorth",
					op: "atLeast",
					amount: 1,
					terms: "nominal",
				}),
			],
		)
		expect(result.ok && result.projection.milestones).toEqual([{ id: "never", reached: false }])
	})
})

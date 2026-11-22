import { describe, expect, it } from "bun:test"
import { income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import type { Milestone } from "../types"
import { firedOn, milestoned, milestonedResult } from "./test-milestones"

const cash = { id: "cash", kind: "asset", rate: 0 } as const
const brokerage = { id: "brokerage", kind: "asset", rate: 0 } as const

/** Salary of 1,000 on each 1st. Cash keeps 1,000; the rest of each month's surplus goes to brokerage. */
const twoAccounts = {
	accounts: [cash, brokerage],
	balances: { cash: 0, brokerage: 0 },
	flows: [income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })],
	surplus: [{ account: "cash", upTo: 1000 }, { account: "brokerage" }],
	withdraw: ["cash", "brokerage"],
	start: "2026-01-01",
	horizon: "2026-12-31",
} as const satisfies Setup

describe("a metric on one Account of a two-Account plan reads only that Account", () => {
	it("fires on the 1 May when opening brokerage first reaches 2,500", () => {
		// Jan 1 fills cash to 1,000. Brokerage opens 1 Apr at 2,000 (Feb, Mar) and 1 May at 3,000.
		const brokerageAtLeast: Milestone = {
			id: "invested",
			combine: "all",
			criteria: [
				{
					id: "c",
					kind: "metric",
					metric: { accounts: ["brokerage"] },
					op: "atLeast",
					amount: 2500,
					terms: "nominal",
				},
			],
		}
		const projection = milestoned(twoAccounts, [brokerageAtLeast])
		expect(firedOn(projection, "invested")).toBe("2026-05-01")
	})

	it("reads the whole net worth across both Accounts for netWorth", () => {
		// Net worth opens 1 Apr at 3,000 (cash 1,000 and brokerage 2,000), so 3,000 is reached then.
		const netWorth: Milestone = {
			id: "total",
			combine: "all",
			criteria: [
				{
					id: "c",
					kind: "metric",
					metric: "netWorth",
					op: "atLeast",
					amount: 3000,
					terms: "nominal",
				},
			],
		}
		expect(firedOn(milestoned(twoAccounts, [netWorth]), "total")).toBe("2026-04-01")
	})
})

describe("a dynamic Milestone that would fire after the run ends is reported reached false", () => {
	it("is false when the run runs out before its date", () => {
		// Rent 1,500 a month against cash of 1,000 runs out on 1 Jan. The 'any' Milestone is dynamic
		// (its metric never holds), and its date, 1 Jun, falls after the run.
		const late: Milestone = {
			id: "late",
			combine: "any",
			criteria: [
				{ id: "d", kind: "date", on: "2026-06-01" },
				{
					id: "m",
					kind: "metric",
					metric: "netWorth",
					op: "atLeast",
					amount: 1e12,
					terms: "nominal",
				},
			],
		}
		const result = milestonedResult(
			{
				accounts: [cash],
				balances: { cash: 1000 },
				flows: [
					{
						id: "rent",
						kind: "expense",
						amount: 1500,
						growth: { bps: 0 },
						frequency: "monthly",
						start: "2026-01-01",
					},
				],
				surplus: [{ account: "cash" }],
				withdraw: ["cash"],
				start: "2026-01-01",
				horizon: "2026-12-31",
			},
			[late],
		)
		expect(result.ok && result.projection.runsOut?.date).toBe("2026-01-01")
		expect(result.ok && result.projection.milestones).toEqual([{ id: "late", reached: false }])
	})
})

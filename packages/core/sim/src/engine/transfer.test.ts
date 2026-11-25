import { describe, expect, it } from "bun:test"
import type { Account, Milestone } from "../types"
import { amounts, rowAt } from "./test-helpers"
import { projected } from "./test-payout"
import { transfer, transferAll, transferShare } from "./test-transfer"

const savings: Account = { id: "savings", kind: "asset", rate: 0 }
const deposit: Account = { id: "deposit", kind: "asset", rate: 0 }
const YEAR = { start: "2026-01-01", horizon: "2026-12-31", surplus: [{ account: "savings" }] }

describe("a transfer moves money between the plan's own Accounts", () => {
	// A provident fund of 3,000,000 rolled into a locked RMF on 30 June: all of it moves, net worth is unchanged.
	it("moves a whole fund once, into a locked Account, leaving net worth as it was", () => {
		const pvd: Account = { id: "pvd", kind: "asset", rate: 0 }
		const rmf: Account = { id: "rmf", kind: "asset", rate: 0, lockedUntil: "2027-01-01" }
		const projection = projected({
			...YEAR,
			accounts: [pvd, rmf],
			balances: { pvd: 3_000_000 },
			flows: [transferAll("roll", "pvd", "rmf", { start: "2026-06-30" })],
			surplus: [{ account: "pvd" }],
		})
		expect(amounts(rowAt(projection, "2026-06-29"))).toEqual({ pvd: 3_000_000, rmf: 0 })
		expect(amounts(rowAt(projection, "2026-06-30"))).toEqual({ pvd: 0, rmf: 3_000_000 })
		expect(rowAt(projection, "2026-06-29").netWorth).toBe(3_000_000)
		expect(rowAt(projection, "2026-06-30").netWorth).toBe(3_000_000)
		expect(rowAt(projection, "2026-06-30").accessibleNetWorth).toBe(0)
		expect(projection.annual[0]).toMatchObject({ transfers: 3_000_000, interest: 0, unmet: 0 })
	})

	// 10% of what savings holds each 1 January, floored: 100,000 of 1,000,000, 90,000 of 900,000, 81,000 of 810,000.
	it("moves a yearly 10 per cent share of what the source holds", () => {
		const projection = projected({
			accounts: [savings, deposit],
			balances: { savings: 1_000_000 },
			flows: [
				transferShare(
					"share",
					"savings",
					"deposit",
					{ num: 1000, den: 10_000 },
					{ frequency: "annual" },
				),
			],
			surplus: [{ account: "savings" }],
			start: "2026-01-01",
			horizon: "2028-12-31",
		})
		expect(amounts(rowAt(projection, "2026-01-01"))).toEqual({ savings: 900_000, deposit: 100_000 })
		expect(amounts(rowAt(projection, "2027-01-01"))).toEqual({ savings: 810_000, deposit: 190_000 })
		expect(amounts(rowAt(projection, "2028-01-01"))).toEqual({ savings: 729_000, deposit: 271_000 })
		expect(projection.annual.map((year) => year.transfers)).toEqual([100_000, 90_000, 81_000])
	})

	// A loan of 250,000 paid 100,000 a month from savings: 150,000, 50,000, then 0 owed with 50,000 moved, then nothing.
	it("pays a loan down and stops at zero owed, in the liability statement", () => {
		const loan: Account = { id: "loan", kind: "liability", rate: 0 }
		const projection = projected(
			{
				accounts: [savings, loan],
				balances: { savings: 1_000_000, loan: 250_000 },
				flows: [transfer("pay", "savings", "loan", 100_000, { frequency: "monthly" })],
				surplus: [{ account: "savings" }],
				start: "2026-01-01",
				horizon: "2026-06-30",
			},
			{ liabilityStatements: true, cashflowBreakdown: true },
		)
		expect(amounts(rowAt(projection, "2026-01-01"))).toEqual({ savings: 900_000, loan: 150_000 })
		expect(amounts(rowAt(projection, "2026-03-01"))).toEqual({ savings: 750_000, loan: 0 })
		expect(rowAt(projection, "2026-06-30").netWorth).toBe(750_000)
		const months = projection.liabilities![0]!.months.map((month) => [
			month.transferred,
			month.closing,
		])
		expect(months).toEqual([
			[100_000, 150_000],
			[100_000, 50_000],
			[50_000, 0],
			[0, 0],
			[0, 0],
			[0, 0],
		])
		expect(projection.liabilities![0]!.paidOff).toBe("2026-03-01")
		expect(projection.liabilities![0]!.months[0]!.paid).toBe(0)
		// Six planned 100,000 payments: 250,000 moved, 350,000 not.
		expect(projection.cashflow![0]!.transfers).toEqual([
			{ flow: "pay", source: "savings", target: "loan", amount: 250_000, unmoved: 350_000 },
		])
	})

	it("moves what the source holds when it holds less, and is no Shortfall", () => {
		const projection = projected(
			{
				...YEAR,
				accounts: [savings, deposit],
				balances: { savings: 40_000 },
				flows: [transfer("move", "savings", "deposit", 100_000, { start: "2026-03-01" })],
			},
			{ cashflowBreakdown: true },
		)
		expect(amounts(rowAt(projection, "2026-03-01"))).toEqual({ savings: 0, deposit: 40_000 })
		expect(projection.runsOut).toBeUndefined()
		expect(projection.cashflow![0]!.transfers![0]).toMatchObject({
			amount: 40_000,
			unmoved: 60_000,
		})
		expect(projection.cashflow![0]!.unmet).toBe(0)
	})
})

describe("a transfer from a locked source", () => {
	const open: Milestone = {
		id: "open",
		combine: "all",
		criteria: [{ id: "on", kind: "date", on: "2026-01-01" }],
	}

	// Locked until 1 April: the monthly 100,000 of January, February and March move nothing, April's moves.
	it("moves nothing while locked, and reports the money it could not move", () => {
		const locked: Account = { id: "savings", kind: "asset", rate: 0, lockedUntil: "2026-04-01" }
		const projection = projected(
			{
				...YEAR,
				accounts: [locked, deposit],
				balances: { savings: 500_000 },
				horizon: "2026-04-30",
				flows: [
					transfer("move", "savings", "deposit", 100_000, {
						frequency: "monthly",
						startAt: "open",
					}),
				],
			},
			{ cashflowBreakdown: true },
			{ milestones: [open] },
		)
		expect(amounts(rowAt(projection, "2026-03-31"))).toEqual({ savings: 500_000, deposit: 0 })
		expect(amounts(rowAt(projection, "2026-04-01"))).toEqual({ savings: 400_000, deposit: 100_000 })
		expect(projection.cashflow![0]!.transfers![0]).toMatchObject({
			amount: 100_000,
			unmoved: 300_000,
		})
	})
})

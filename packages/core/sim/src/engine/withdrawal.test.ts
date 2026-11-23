import { describe, expect, it } from "bun:test"
import type { Account, Flow } from "../types"
import { contribution, expense, income } from "./test-flows"
import { run } from "./test-helpers"
import { amounts, rowAt } from "./test-rows"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const car: Account = { id: "car", kind: "asset", rate: 0 }
const savings: Account = { id: "savings", kind: "asset", rate: 0 }
const loan: Account = { id: "loan", kind: "liability", rate: 0 }

/** A planned withdrawal of `amount` from the loan, landing on `date` and not repeated. */
function borrow(id: string, amount: number, date: string): Flow {
	return {
		id,
		kind: "withdrawal",
		source: "loan",
		frequency: "once",
		start: date,
		amount,
		growth: { bps: 0 },
	}
}

const BORROW_DAY = { start: "2026-03-14", horizon: "2026-03-16", resolution: "day" } as const

describe("a planned withdrawal borrows into a liability", () => {
	// 500,000.00 borrowed on the 15th: the loan owes 500,000.00 and the cash lands in surplus.
	// Net worth is 0 before and after the withdrawal, so the day's net worth does not move.
	it("raises the liability and the cash by the same amount, so net worth is unchanged", () => {
		const projection = run({
			accounts: [cash, loan],
			balances: { cash: 0, loan: 0 },
			flows: [borrow("borrow", 50_000_000, "2026-03-15")],
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			...BORROW_DAY,
		})
		const day = rowAt(projection, "2026-03-15")
		expect(amounts(day)).toEqual({ cash: 50_000_000, loan: 50_000_000 })
		expect(day.netWorth).toBe(0)
		expect(rowAt(projection, "2026-03-14").netWorth).toBe(0)
	})

	it("reports the planned withdrawal as withdrawals, not income, and keeps the residual interest at 0", () => {
		const projection = run({
			accounts: [cash, loan],
			balances: { cash: 0, loan: 0 },
			flows: [borrow("borrow", 50_000_000, "2026-03-15")],
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			start: "2026-03-01",
			horizon: "2026-03-31",
			resolution: "month",
		})
		const [march] = projection.annual
		expect(march?.withdrawals).toBe(50_000_000)
		expect(march?.income).toBe(0)
		expect(march?.interest).toBe(0)
	})

	// The withdrawal pays the 30,000.00 expense on its own date, so the withdraw list keeps savings.
	it("pays a same-date expense from the withdrawn cash before the withdraw list", () => {
		const projection = run({
			accounts: [cash, savings, loan],
			balances: { cash: 0, savings: 1_000_000, loan: 0 },
			flows: [
				borrow("borrow", 5_000_000, "2026-03-15"),
				expense("rent", 3_000_000, { start: "2026-03-15" }),
			],
			surplus: [{ account: "cash" }],
			withdraw: ["cash", "savings"],
			...BORROW_DAY,
		})
		expect(amounts(rowAt(projection, "2026-03-15"))).toEqual({
			cash: 2_000_000,
			savings: 1_000_000,
			loan: 5_000_000,
		})
	})

	// Owner decision (#276): withdrawn cash is not Available cashflow, so a same-date asset
	// Contribution is not funded from it, and the 300,000.00 is reported as unfunded.
	it("does not fund a same-date asset Contribution from the withdrawn cash", () => {
		const projection = run({
			accounts: [cash, car, loan],
			balances: { cash: 0, car: 0, loan: 0 },
			flows: [
				borrow("borrow", 5_000_000, "2026-03-15"),
				contribution("car-fund", "car", 3_000_000, { start: "2026-03-15" }),
			],
			surplus: [{ account: "cash" }],
			contribute: ["car"],
			...BORROW_DAY,
		})
		expect(amounts(rowAt(projection, "2026-03-15"))).toEqual({
			cash: 5_000_000,
			car: 0,
			loan: 5_000_000,
		})
		expect(projection.unfundedContributions).toEqual([{ account: "car", amount: 3_000_000 }])
	})
})

describe("a planned withdrawal accrues interest on the liability it raised", () => {
	// 100,000.00 borrowed on Jan 15 at 6% nominal monthly, 16 counted days to Jan 31:
	// 10,000,000 × 0.005 × 16 / 31 = 25,806.45 cents, rounded half up to 25,806.
	it("accrues 25,806 cents of nominal interest from the withdrawal to month end", () => {
		const projection = run({
			accounts: [cash, { id: "loan", kind: "liability", rate: 600, compounding: "monthly" }],
			balances: { cash: 0, loan: 0 },
			flows: [borrow("borrow", 10_000_000, "2026-01-15")],
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			start: "2025-12-31",
			horizon: "2026-01-31",
			resolution: "month",
		})
		expect(rowAt(projection, "2026-01-31").balances.find((b) => b.account === "loan")?.amount).toBe(
			10_025_806,
		)
	})
})

describe("a Scenario without a withdrawal keeps the Projection shape", () => {
	it("omits the withdrawals field from annual roll-ups", () => {
		const projection = run({
			accounts: [cash],
			balances: { cash: 100 },
			flows: [income("pay", 10, { start: "2026-01-15" })],
			surplus: [{ account: "cash" }],
			start: "2026-01-01",
			horizon: "2026-02-01",
			resolution: "month",
		})
		expect(projection.annual[0]).not.toHaveProperty("withdrawals")
	})
})

import { describe, expect, it } from "bun:test"
import { thrown } from "./builders.fixtures"
import { parseCurrency } from "./currency"
import { accountId } from "./ids"
import { trialBalance, trialBalanceAgrees } from "./index"
import { chart } from "./queries.fixtures"
import { BIG, post } from "./queries.overflow.fixtures"
import { columnsAgree } from "./trial-balance-agrees"

const row = (debit: number, credit: number) =>
	({
		entityId: "default",
		accountId: accountId("cash"),
		currency: parseCurrency("THB"),
		debit,
		credit,
	}) as const

describe("whether a trial balance balances without stating its total", () => {
	it("balances when the columns' sums leave the safe range though every row is inside it", () => {
		const txs = [post("a", "cash", "equity", BIG), post("b", "savings", "salary", BIG)]
		expect(thrown(() => trialBalance(txs, "2024-01-01", chart))).toMatchObject({
			code: "AMOUNT_OVERFLOW",
		})
		expect(trialBalanceAgrees(txs, "2024-01-01", chart)).toBe(true)
	})

	it("balances a ledger whose totals are in range", () => {
		expect(trialBalanceAgrees([post("a", "cash", "equity", 100)], "2024-01-01", chart)).toBe(true)
	})

	it("balances an empty ledger", () => {
		expect(trialBalanceAgrees([], "2024-01-01", chart)).toBe(true)
	})

	it("does not balance when one currency's columns differ by one satang past the range", () => {
		expect(columnsAgree([row(BIG, 0), row(BIG, 0), row(0, BIG), row(0, BIG - 1)])).toBe(false)
		expect(columnsAgree([row(BIG, 0), row(BIG, 0), row(0, BIG), row(0, BIG)])).toBe(true)
	})

	it("refuses a row outside the safe range at its row", () => {
		const txs = [
			post("a", "cash", "equity", Number.MAX_SAFE_INTEGER),
			post("b", "cash", "equity", 1),
		]
		expect(thrown(() => trialBalanceAgrees(txs, "2024-01-01", chart))).toMatchObject({
			code: "AMOUNT_OVERFLOW",
			field: "trialBalance.rows[cash]",
		})
	})
})

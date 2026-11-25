import { describe, expect, it } from "bun:test"
import { thrown } from "./builders.fixtures"
import { profitAndLoss, profitAndLossRows, trialBalance, trialBalanceRows } from "./index"
import { chart } from "./queries.fixtures"
import { BIG, post } from "./queries.overflow.fixtures"

describe("the rows of a query whose total overflows", () => {
	it("states the trial balance rows when a column total leaves the safe range", () => {
		const txs = [post("a", "cash", "equity", BIG), post("b", "savings", "salary", BIG)]
		expect(thrown(() => trialBalance(txs, "2024-01-01", chart))).toMatchObject({
			field: "trialBalance.totals[default/THB].debit",
		})
		const rows = trialBalanceRows(txs, "2024-01-01", chart)
		const amounts = (id: string) => rows.find((row) => row.accountId === id)
		expect(amounts("cash")).toMatchObject({ debit: BIG, credit: 0 })
		expect(amounts("equity")).toMatchObject({ debit: 0, credit: BIG })
	})

	it("states the same rows trialBalance does when nothing overflows", () => {
		const txs = [post("a", "cash", "equity", 100)]
		expect(trialBalanceRows(txs, "2024-01-01", chart)).toEqual(
			trialBalance(txs, "2024-01-01", chart).rows,
		)
	})

	it("refuses a trial balance row that is itself out of range", () => {
		const txs = [
			post("a", "cash", "equity", Number.MAX_SAFE_INTEGER),
			post("b", "cash", "equity", 1),
		]
		expect(thrown(() => trialBalanceRows(txs, "2024-01-01", chart))).toMatchObject({
			code: "AMOUNT_OVERFLOW",
			field: "trialBalance.rows[cash]",
		})
	})

	it("states the P&L rows when the total leaves the safe range, plain and grouped", () => {
		const txs = [post("a", "cash", "food", BIG), post("b", "cash", "salary", BIG)]
		const options = { from: "2024-01-01", to: "2024-01-01" }
		expect(thrown(() => profitAndLoss(txs, options, chart))).toMatchObject({
			field: "profitAndLoss.totals[default/THB]",
		})
		const rows = profitAndLossRows(txs, options, chart)
		expect(rows.find((row) => row.accountId === "food")?.amount).toBe(-BIG)
		expect(rows.find((row) => row.accountId === "salary")?.amount).toBe(-BIG)
		expect(profitAndLossRows(txs, { ...options, groupBy: "team" }, chart).length).toBe(2)
	})

	it("states the same rows profitAndLoss does when nothing overflows", () => {
		const txs = [post("a", "food", "cash", 100)]
		const options = { from: "2024-01-01", to: "2024-01-01" }
		expect(profitAndLossRows(txs, options, chart)).toEqual(profitAndLoss(txs, options, chart).rows)
	})
})

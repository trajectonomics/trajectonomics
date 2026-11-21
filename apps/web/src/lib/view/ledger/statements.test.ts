import { describe, expect, test } from "bun:test"

import type { AmountRow, Balance, Pnl } from "../../contract"
import { periodOf, pnlView } from "./pnl"
import { trialBalanceView } from "./trial-balance"

const account = (id: string, name: string) => ({ id, name })

describe("trialBalanceView", () => {
	test("returns the CLI's rows and totals in its order, with no sum of its own", () => {
		const trial: NonNullable<Balance["trialBalance"]> = {
			rows: [
				{ account: account("bank", "Bank"), debit: "50.00", credit: "0.00", currency: "THB" },
				{ account: account("loan", "Loan"), debit: "0.00", credit: "50.00", currency: "THB" },
			],
			totals: [{ currency: "THB", debit: "50.00", credit: "50.00" }],
		}
		const view = trialBalanceView(trial)
		expect(view?.lines.map((line) => [line.account, line.debit, line.credit])).toEqual([
			["Bank", "50.00", "0.00"],
			["Loan", "0.00", "50.00"],
		])
		expect(view?.totals).toEqual([{ currency: "THB", debit: "50.00", credit: "50.00" }])
	})

	test("returns null when the CLI stated no trial balance", () => {
		expect(trialBalanceView(undefined)).toBeNull()
	})
})

describe("pnlView", () => {
	const amountRow = (name: string, type: AmountRow["type"], amount: string): AmountRow => ({
		account: account(name.toLowerCase(), name),
		type,
		amount,
		currency: "THB",
	})

	const report: Pnl = {
		since: "2026-01-01",
		until: "2026-10-31",
		project: null,
		rows: [
			amountRow("Living", "expense", "100.00"),
			amountRow("Salary", "income", "-300.00"),
			amountRow("Travel", "expense", "25.00"),
		],
		totals: [{ currency: "THB", amount: "175.00" }],
	}

	test("lists the income rows first, then the expense rows, each in the CLI's order", () => {
		const view = pnlView(report)
		expect(view.income.map((line) => [line.account, line.amount])).toEqual([["Salary", "-300.00"]])
		expect(view.expense.map((line) => [line.account, line.amount])).toEqual([
			["Living", "100.00"],
			["Travel", "25.00"],
		])
	})

	test("states the period in its heading from the report's since and until", () => {
		expect(pnlView(report).period).toBe("1 Jan 2026 to 31 Oct 2026")
		expect(periodOf(null, "2026-10-31")).toBe("the start of the ledger to 31 Oct 2026")
	})

	test("passes the CLI's totals through unchanged", () => {
		expect(pnlView(report).totals).toEqual([{ currency: "THB", amount: "175.00" }])
	})
})

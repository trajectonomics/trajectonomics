import { describe, expect, test } from "bun:test"
import { netWorth, row } from "../overview/fixtures.test-support"
import { accountTypeLabel } from "./account-type"
import { netWorthView, noTransactionsNote } from "./view"

describe("netWorthView", () => {
	test("shows the As-of, the totals, the bars and the liabilities of one report", () => {
		const data = netWorth(
			"2026-10-31",
			[row("Bank", "asset", "600.00"), row("Loan", "liability", "-200.00")],
			[{ currency: "THB", amount: "400.00" }],
		)
		const view = netWorthView(data)
		expect(view.asOf).toBe("31 Oct 2026")
		expect(view.totals).toEqual([{ currency: "THB", amount: "400.00" }])
		expect(view.bars).toHaveLength(1)
		expect(view.liabilities.map((item) => item.amount)).toEqual(["-200.00"])
		expect(view.rows).toHaveLength(2)
		expect(view.note).toBeNull()
	})

	test("handles an empty report with no rows and no totals", () => {
		const view = netWorthView(netWorth("2026-10-31", [], [], null))
		expect(view.bars).toEqual([])
		expect(view.liabilities).toEqual([])
		expect(view.totals).toEqual([])
	})
})

describe("noTransactionsNote", () => {
	test("says the zero is not a real reading, naming the first transaction", () => {
		const note = noTransactionsNote(
			netWorth("2024-10-31", [], [{ currency: "THB", amount: "0.00" }], "2024-11-01", true),
		)
		expect(note).toBe(
			"The As-of, 31 Oct 2024, is before the first transaction on 1 Nov 2024, so the zero is not a real reading.",
		)
	})

	test("says the ledger records no transaction when there is no first date", () => {
		const note = noTransactionsNote(netWorth("2024-10-31", [], [], null, true))
		expect(note).toBe(
			"The ledger records no transaction, so the zero at 31 Oct 2024 is not a real reading.",
		)
	})

	test("says nothing when the As-of has transactions behind it", () => {
		expect(noTransactionsNote(netWorth("2026-10-31", [], []))).toBeNull()
	})
})

describe("accountTypeLabel", () => {
	test("names every kind of account in the reader's words", () => {
		expect(accountTypeLabel("asset")).toBe("Asset")
		expect(accountTypeLabel("liability")).toBe("Liability")
		expect(accountTypeLabel("expense")).toBe("Expense")
	})
})

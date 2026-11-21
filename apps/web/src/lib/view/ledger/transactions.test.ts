import { describe, expect, test } from "bun:test"

import type { TxList } from "../../contract"
import {
	accountOptions,
	describePeriod,
	filterTransactions,
	periodOfRead,
	transactionRows,
} from "./transactions"

type Tx = TxList["transactions"][number]

function tx(id: string, date: string, memo: string | null, legs: [string, string][]): Tx {
	return {
		id,
		date,
		memo,
		linkedTo: null,
		externalRef: null,
		postings: legs.map(([accountId, amount], ordinal) => ({
			ordinal,
			account: { id: accountId, name: `Account ${accountId}` },
			amount,
			currency: "THB",
			dimensions: null,
		})),
	}
}

const list: TxList = {
	transactions: [
		tx("t1", "2026-08-01", "Rent for August", [
			["rent", "100.00"],
			["bank", "-100.00"],
		]),
		tx("t2", "2026-09-01", "Salary", [
			["bank", "900.00"],
			["salary", "-900.00"],
		]),
		tx("t3", "2026-09-01", null, [
			["living", "30.00"],
			["bank", "-30.00"],
		]),
		tx("t4", "2026-09-05", "rent top-up", [
			["rent", "20.00"],
			["bank", "-20.00"],
		]),
	],
}

const rows = transactionRows(list)
const none = { account: "", memo: "" }

describe("transactionRows", () => {
	test("orders the rows newest first, and a date tie by id, descending", () => {
		expect(rows.map((row) => row.id)).toEqual(["t4", "t3", "t2", "t1"])
	})

	test("keeps every posting with its account and the CLI's signed amount", () => {
		const salary = rows.find((row) => row.id === "t2")
		expect(salary?.postings.map((p) => [p.account, p.amount])).toEqual([
			["Account bank", "900.00"],
			["Account salary", "-900.00"],
		])
	})

	test("yields no rows for an empty list", () => {
		expect(transactionRows({ transactions: [] })).toEqual([])
	})
})

describe("filterTransactions", () => {
	test("keeps every row when neither filter is set", () => {
		expect(filterTransactions(rows, none)).toHaveLength(rows.length)
	})

	test("keeps a row with a posting to the chosen account, whichever side it is on", () => {
		const ids = filterTransactions(rows, { account: "rent", memo: "" }).map((row) => row.id)
		expect(ids).toEqual(["t4", "t1"])
	})

	test("matches the memo by a case-insensitive part of its text, ignoring the ends", () => {
		const ids = filterTransactions(rows, { account: "", memo: "  RENT " }).map((row) => row.id)
		expect(ids).toEqual(["t4", "t1"])
	})

	test("never matches a row with no memo to a memo filter", () => {
		const ids = filterTransactions(rows, { account: "", memo: "a" }).map((row) => row.id)
		expect(ids).not.toContain("t3")
	})

	test("applies both filters together", () => {
		const ids = filterTransactions(rows, { account: "bank", memo: "salary" }).map((row) => row.id)
		expect(ids).toEqual(["t2"])
	})

	test("returns nothing when no loaded row matches", () => {
		expect(filterTransactions(rows, { account: "", memo: "zzz" })).toEqual([])
	})
})

describe("accountOptions", () => {
	test("offers All accounts first, then each account with a posting, by name", () => {
		const options = accountOptions(rows, "")
		expect(options[0]).toEqual({ value: "", label: "All accounts" })
		expect(options.slice(1).map((option) => option.label)).toEqual([
			"Account bank",
			"Account living",
			"Account rent",
			"Account salary",
		])
	})

	test("still offers a selected account that no loaded row names, so the filter shows", () => {
		const options = accountOptions(rows, "ghost")
		expect(options.at(-1)).toEqual({ value: "ghost", label: "ghost" })
	})
})

describe("periodOfRead", () => {
	test("reads the --since and --until values from the Read's argv", () => {
		const argv = ["tx", "list", "--since", "2026-08-01", "--until", "2026-10-31", "--json"]
		expect(periodOfRead(argv)).toEqual({ since: "2026-08-01", until: "2026-10-31" })
	})

	test("describes the period in words, and says when a bound is missing", () => {
		expect(describePeriod(["tx", "list", "--since", "2026-08-01", "--until", "2026-10-31"])).toBe(
			"1 Aug 2026 to 31 Oct 2026",
		)
		expect(describePeriod(["tx", "list", "--json"])).toBe(
			"the start of the ledger to the latest transaction",
		)
	})
})

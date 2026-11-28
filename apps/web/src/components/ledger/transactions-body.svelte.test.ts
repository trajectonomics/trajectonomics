import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { Read, TxList } from "../../lib/contract"
import { failure, leg, tx } from "./fixtures.test-support"
import TransactionsBody from "./TransactionsBody.svelte"

const list: TxList = {
	transactions: [
		tx("t1", "2026-08-01", null, [
			leg("rent", "Rent", "100.00", 0),
			leg("bank", "Bank", "-100.00", 1),
		]),
		tx("t2", "2026-09-02", "Salary", [
			leg("bank", "Bank", "900.00", 0),
			leg("salary", "Salary", "-900.00", 1),
		]),
	],
}

const read: Read<TxList> = {
	argv: ["tx", "list", "--since", "2026-08-01", "--until", "2026-10-31", "--json"],
	ok: true,
	data: list,
}

const none = { account: "", memo: "" }
const noop = () => undefined

describe("TransactionsBody", () => {
	// The commands under Details are a Display setting, off by default.
	beforeEach(() => {
		preferences.showCommands = true
	})
	afterEach(() => {
		preferences.showCommands = false
	})

	test("shows the rows newest first with their period, the account choices and the command", () => {
		const { body } = render(TransactionsBody, {
			props: { read, filter: none, onAccount: noop, onMemo: noop },
		})
		expect(body).toContain("Showing 2 of 2 transactions, from 1 Aug 2026 to 31 Oct 2026.")
		expect(body).toContain("hidden sm:block")
		expect(body).toContain("sm:hidden")
		expect(body.indexOf("Salary")).toBeLessThan(body.indexOf("No memo"))
		expect(body).toContain('<option value="rent">Rent</option>')
		expect(body).toContain("traj tx list --since 2026-08-01 --until 2026-10-31 --json")
	})

	test("says the period holds no transaction when the list is empty", () => {
		const empty: Read<TxList> = { ...read, data: { transactions: [] } }
		const { body } = render(TransactionsBody, {
			props: { read: empty, filter: none, onAccount: noop, onMemo: noop },
		})
		expect(body).toContain("No transactions in this period")
		expect(body).not.toContain("<table")
	})

	test("offers to clear the filters when none of the loaded rows matches", () => {
		const { body } = render(TransactionsBody, {
			props: {
				read,
				filter: { account: "", memo: "zzz" },
				onAccount: noop,
				onMemo: noop,
			},
		})
		expect(body).toContain("No transaction matches these filters")
		expect(body).toContain("Clear the filters")
	})

	test("shows the CLI's error in its section when the transactions Read failed", () => {
		const { body } = render(TransactionsBody, {
			props: {
				read: failure<TxList>(read.argv, "The period is closed."),
				filter: none,
				onAccount: noop,
				onMemo: noop,
			},
		})
		expect(body).toContain("The transactions could not be read")
		expect(body).toContain("The period is closed.")
	})
})

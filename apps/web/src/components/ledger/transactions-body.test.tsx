import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { Read, TxList } from "../../lib/contract"
import { failure, leg, tx } from "./fixtures.test-support"
import { TransactionsBody } from "./TransactionsBody"

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
	test("shows the rows newest first with their period, the account choices and the command", () => {
		const html = renderToStaticMarkup(
			<TransactionsBody read={read} filter={none} onAccount={noop} onMemo={noop} />,
		)
		expect(html).toContain("Showing 2 of 2 transactions, from 1 Aug 2026 to 31 Oct 2026.")
		expect(html).toContain("hidden sm:block")
		expect(html).toContain("sm:hidden")
		expect(html.indexOf("Salary")).toBeLessThan(html.indexOf("No memo"))
		expect(html).toContain('<option value="rent">Rent</option>')
		expect(html).toContain("traj tx list --since 2026-08-01 --until 2026-10-31 --json")
	})

	test("says the period holds no transaction when the list is empty", () => {
		const empty: Read<TxList> = { ...read, data: { transactions: [] } }
		const html = renderToStaticMarkup(
			<TransactionsBody read={empty} filter={none} onAccount={noop} onMemo={noop} />,
		)
		expect(html).toContain("No transactions in this period")
		expect(html).not.toContain("<table")
	})

	test("offers to clear the filters when none of the loaded rows matches", () => {
		const html = renderToStaticMarkup(
			<TransactionsBody
				read={read}
				filter={{ account: "", memo: "zzz" }}
				onAccount={noop}
				onMemo={noop}
			/>,
		)
		expect(html).toContain("No transaction matches these filters")
		expect(html).toContain("Clear the filters")
	})

	test("shows the CLI's error in its section when the transactions Read failed", () => {
		const html = renderToStaticMarkup(
			<TransactionsBody
				read={failure(read.argv, "The period is closed.")}
				filter={none}
				onAccount={noop}
				onMemo={noop}
			/>,
		)
		expect(html).toContain("The transactions could not be read")
		expect(html).toContain("The period is closed.")
	})
})

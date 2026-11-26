import { describe, expect, test } from "bun:test"
import { doctor, failed, passed } from "./fixtures.test-support"
import { healthView } from "./health"

describe("healthView", () => {
	test("counts the failed checks and keeps the CLI's verdict", () => {
		const view = healthView(
			doctor([passed("directory"), failed("integrity"), failed("ledger")], false),
		)
		expect(view.ok).toBe(false)
		expect(view.failed).toBe(2)
		expect(view.checks).toBe(3)
	})

	test("reports no failed checks when every check passes", () => {
		const view = healthView(doctor([passed("directory"), passed("database")]))
		expect(view.ok).toBe(true)
		expect(view.failed).toBe(0)
	})

	test("lists the row counts in the reader's words", () => {
		const view = healthView(doctor([]))
		expect(view.counts).toEqual([
			{ label: "Entities", value: 1 },
			{ label: "Accounts", value: 3 },
			{ label: "Transactions", value: 4 },
			{ label: "Postings", value: 8 },
			{ label: "Plans", value: 1 },
		])
	})
})

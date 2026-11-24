import { describe, expect, it } from "bun:test"
import { chartHome, parsed, type Valued, value } from "./account-value-support"
import type { Traj } from "./tx-test-support"

/** A transaction a person recorded with `tx add`, on a date after the one a valuation will state. */
async function own(traj: Traj, memo: string, against: string, date = "2026-04-01") {
	const flags = ["--from", against, "--to", "Fund", "--amount", "50.00", "--date", date]
	const res = await traj(["tx", "add", ...flags, "--memo", memo, "--json"])
	expect(res.code).toBe(0)
}

describe("account value names only what it wrote", () => {
	it("names no transaction whose memo merely starts like a valuation's", async () => {
		const { traj } = await chartHome()
		await own(traj, "Valued at the broker's quote, top-up", "Equity")
		const out = parsed<Valued>(await value(traj, "Fund", "1000.00", "2026-03-01"))
		expect(out.notes).toEqual([])
	})

	it("names no transaction with a valuation's exact memo that is not between the account and income or equity", async () => {
		const { traj } = await chartHome()
		await traj([
			"tx",
			"add",
			"--from",
			"Food",
			"--to",
			"Fund",
			"--amount",
			"50.00",
			"--date",
			"2026-04-01",
			"--memo",
			"Valued at 50.00",
			"--json",
		])
		const out = parsed<Valued>(await value(traj, "Fund", "1000.00", "2026-03-01"))
		expect(out.notes).toEqual([])
	})

	it("says what a liability owes, not its balance, when it names a later valuation", async () => {
		const { traj } = await chartHome()
		await value(traj, "Loan", "500.00", "2026-04-01")
		const out = parsed<Valued>(await value(traj, "Loan", "800.00", "2026-03-01"))
		expect(out.notes[0]).toContain("moves what it owes by 800.00")
		expect(out.notes[0]).toContain("becomes 1300.00")
	})

	it("says its value moves for an asset", async () => {
		const { traj } = await chartHome()
		await value(traj, "Fund", "500.00", "2026-04-01")
		const out = parsed<Valued>(await value(traj, "Fund", "800.00", "2026-03-01"))
		expect(out.notes[0]).toContain("moves its value by 800.00")
	})
})

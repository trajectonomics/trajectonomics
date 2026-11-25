import { describe, expect, it } from "bun:test"
import { chartHome, value } from "./account-value-support"
import { plant } from "./plant-test-support"
import { cli, ledgerSize, type Traj } from "./tx-test-support"

/** The most a Balance can hold, in baht: 2^53 - 1 satang. */
const MOST = "90071992547409.91"

type Entry = { account: string; date: string; value: string }
const doc = (values: Entry[]) => JSON.stringify({ against: "Gains", values })
/** What the refused entry says: a batch lists it in `details.values`, the single form in the envelope. */
const says = (body: { message: string; details?: { values: { reason: { message: string } }[] } }) =>
	body.details?.values[0]?.reason.message ?? body.message
const error = (res: { err: string }) => JSON.parse(res.err.trim().split("\n").at(-1)!).error

/** A transaction a person recorded with `tx add`. */
async function own(traj: Traj, from: string, to: string, amount: string, date: string) {
	const flags = ["--from", from, "--to", to, "--amount", amount, "--date", date, "--json"]
	expect((await traj(["tx", "add", ...flags])).code).toBe(0)
}

const file = (home: string, values: Entry[]) =>
	cli(home, doc(values))(["account", "value", "--file", "-", "--json"])

describe("account value refuses a valuation a later Balance overflows on", () => {
	it("refuses the largest exact amount when a later transaction adds to it, and writes nothing", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		const before = await ledgerSize(traj)
		const res = await file(home, [{ account: "Fund", date: "2026-01-01", value: MOST }])
		expect(res.code).not.toBe(0)
		const body = error(res)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(body.path).toBe("document.values.0.value")
		expect(says(body)).toContain('"Fund" on 2026-01-05')
		expect(await ledgerSize(traj)).toEqual(before)
		expect((await traj(["balance", "--as-of", "2026-01-06", "--json"])).code).toBe(0)
	})

	it("refuses the single form the same way, at its flag", async () => {
		const { traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		const res = await value(traj, "Fund", MOST, "2026-01-01")
		expect(res.code).not.toBe(0)
		expect(error(res)).toMatchObject({ code: "AMOUNT_OVERFLOW", path: "value" })
	})

	it("refuses a liability whose later debt passes the range, in the other direction", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Loan", "Food", "1.00", "2026-01-05")
		const res = await file(home, [{ account: "Loan", date: "2026-01-01", value: MOST }])
		expect(res.code).not.toBe(0)
		expect(says(error(res))).toContain('"Loan" on 2026-01-05')
	})

	it("accepts the batch when a transaction on the same date takes the Balance back", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		await own(traj, "Fund", "Food", "1.00", "2026-01-05")
		const res = await file(home, [{ account: "Fund", date: "2026-01-01", value: MOST }])
		expect(res.code).toBe(0)
		expect((await traj(["balance", "--as-of", "2026-01-06", "--json"])).code).toBe(0)
	})

	it("still refuses when the transaction that takes it back comes after the date that overflows", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		await own(traj, "Fund", "Food", "1.00", "2026-01-08")
		const res = await file(home, [{ account: "Fund", date: "2026-01-01", value: MOST }])
		expect(says(error(res))).toContain('"Fund" on 2026-01-05')
	})

	it("refuses the entry whose write pushes a later Balance over, not the one before it", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		const res = await file(home, [
			{ account: "Fund", date: "2026-01-01", value: "1.00" },
			{ account: "Fund", date: "2026-01-03", value: MOST },
		])
		const body = error(res)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(body.path).toBe("document.values.1.value")
		expect(says(body)).toContain('"Fund" on 2026-01-05')
		expect(body.details.values.map((row: { index: number }) => row.index)).toEqual([1])
	})

	it("refuses an entry that pushes the account it posts against over, by name", async () => {
		const { home, traj } = await chartHome()
		const res = await file(home, [
			{ account: "Fund", date: "2026-01-01", value: MOST },
			{ account: "Home", date: "2026-01-05", value: "1.00" },
		])
		expect(res.code).not.toBe(0)
		const body = error(res)
		expect(body.path).toBe("document.values.1.value")
		expect(says(body)).toContain('the Balance of "Gains" on 2026-01-05')
		expect(says(body)).not.toContain("later")
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("accepts a write that shrinks an overflow the ledger already holds", async () => {
		const { home } = await chartHome()
		plant(home, "Equity", "Fund", "90071992547399.91", "2026-01-05")
		plant(home, "Equity", "Fund", "11.00", "2026-01-06")
		plant(home, "Fund", "Food", "11.00", "2026-01-07")
		const res = await file(home, [{ account: "Fund", date: "2026-01-01", value: "-0.50" }])
		expect(res.code).toBe(0)
	})

	it("accepts a write that cures the first overflow and shrinks a later one", async () => {
		const { home } = await chartHome()
		plant(home, "Equity", "Fund", MOST, "2026-01-05")
		plant(home, "Equity", "Fund", "0.30", "2026-01-06")
		plant(home, "Equity", "Fund", "0.70", "2026-01-07")
		const res = await file(home, [{ account: "Fund", date: "2026-01-01", value: "-0.50" }])
		expect(res.code).toBe(0)
	})

	it("refuses a write that shrinks the first overflow and worsens a later one the other way", async () => {
		const { home } = await chartHome()
		plant(home, "Equity", "Fund", MOST, "2026-01-05")
		plant(home, "Equity", "Fund", "1.00", "2026-01-06")
		plant(home, "Fund", "Food", MOST, "2026-01-07")
		plant(home, "Fund", "Food", MOST, "2026-01-07")
		plant(home, "Fund", "Food", "2.00", "2026-01-07")
		const res = await file(home, [{ account: "Fund", date: "2026-01-01", value: "-0.50" }])
		expect(res.code).not.toBe(0)
		expect(says(error(res))).toContain('"Fund" on 2026-01-07')
	})

	it("accepts a batch that stays in range at every later date", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		const res = await file(home, [
			{ account: "Fund", date: "2026-01-01", value: "90071992547408.90" },
		])
		expect(res.code).toBe(0)
		expect((await traj(["balance", "--as-of", "2026-01-06", "--json"])).code).toBe(0)
	})
})

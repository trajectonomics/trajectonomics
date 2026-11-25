import { describe, expect, it } from "bun:test"
import { chartHome } from "./account-value-support"
import { plant } from "./plant-test-support"
import { cli, ledgerSize, type Traj } from "./tx-test-support"

/** The most a Balance can hold, in baht: 2^53 - 1 satang. */
const MOST = "90071992547409.91"

const error = (res: { err: string }) => JSON.parse(res.err.trim().split("\n").at(-1)!).error

/** `tx add` of one amount between two accounts, as a person types it. */
const add = (
	traj: Traj,
	from: string,
	to: string,
	amount: string,
	date: string,
	...more: string[]
) =>
	traj([
		"tx",
		"add",
		"--from",
		from,
		"--to",
		to,
		"--amount",
		amount,
		"--date",
		date,
		...more,
		"--json",
	])

/** A debt of `amount` on Loan, spent on Food, as a transaction document. */
const borrowed = (amount: string, date: string) =>
	JSON.stringify({
		date,
		postings: [
			{ account: "Loan", amount: `-${amount}`, currency: "THB" },
			{ account: "Food", amount, currency: "THB" },
		],
	})

const readable = async (traj: Traj) =>
	expect((await traj(["balance", "--as-of", "2026-01-09", "--json"])).code).toBe(0)

describe("tx add refuses a transaction that leaves a Balance unreadable", () => {
	it("refuses the 1.00 after the largest exact amount, and writes nothing", async () => {
		const { traj } = await chartHome()
		expect((await add(traj, "Equity", "Home", MOST, "2026-01-05")).code).toBe(0)
		const before = await ledgerSize(traj)
		const res = await add(traj, "Equity", "Home", "1.00", "2026-01-06")
		expect(res.code).not.toBe(0)
		const body = error(res)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(body.path).toBe("postings.0.amount")
		expect(body.message).toContain('the Balance of "Home" on 2026-01-06')
		expect(await ledgerSize(traj)).toEqual(before)
		await readable(traj)
	})

	it("refuses a transaction dated before the Balance it overflows, naming that later date", async () => {
		const { traj } = await chartHome()
		expect((await add(traj, "Equity", "Home", MOST, "2026-01-06")).code).toBe(0)
		const res = await add(traj, "Equity", "Home", "1.00", "2026-01-05")
		expect(error(res).code).toBe("AMOUNT_OVERFLOW")
		expect(error(res).message).toContain('a later Balance of "Home" on 2026-01-06')
		await readable(traj)
	})

	it("refuses a dry run the same way", async () => {
		const { traj } = await chartHome()
		expect((await add(traj, "Equity", "Home", MOST, "2026-01-05")).code).toBe(0)
		const res = await add(traj, "Equity", "Home", "1.00", "2026-01-06", "--dry-run")
		expect(error(res).code).toBe("AMOUNT_OVERFLOW")
	})

	it("refuses a liability whose debt passes the range, the other way, at the posting that owes it", async () => {
		const { home, traj } = await chartHome()
		const post = (text: string) => cli(home, text)(["tx", "add", "--postings", "-", "--json"])
		expect((await post(borrowed(MOST, "2026-01-05"))).code).toBe(0)
		const res = await post(borrowed("1.00", "2026-01-06"))
		const body = error(res)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(body.path).toBe("postings.0.amount")
		expect(body.message).toContain('the Balance of "Loan" on 2026-01-06')
		await readable(traj)
	})

	it("accepts a transaction that leaves every Balance in range", async () => {
		const { traj } = await chartHome()
		expect((await add(traj, "Equity", "Home", MOST, "2026-01-05")).code).toBe(0)
		expect((await add(traj, "Home", "Food", "1.00", "2026-01-06")).code).toBe(0)
		await readable(traj)
	})

	it("accepts a transaction that cures an overflow the ledger already holds, and shrinks the rest", async () => {
		const { home, traj } = await chartHome()
		plant(home, "Equity", "Fund", MOST, "2026-01-05")
		plant(home, "Equity", "Fund", "1.00", "2026-01-06")
		expect((await add(traj, "Fund", "Gains", "0.50", "2026-01-05")).code).toBe(0)
		expect((await ledgerSize(traj)).transactions).toBe(3)
	})

	it("refuses a transaction that shrinks the first overflow and worsens a later one the other way", async () => {
		const { home, traj } = await chartHome()
		plant(home, "Equity", "Fund", MOST, "2026-01-05")
		plant(home, "Equity", "Fund", "1.00", "2026-01-06")
		plant(home, "Fund", "Food", MOST, "2026-01-07")
		plant(home, "Fund", "Food", MOST, "2026-01-07")
		plant(home, "Fund", "Food", "2.00", "2026-01-07")
		const res = await add(traj, "Fund", "Gains", "0.50", "2026-01-01")
		expect(error(res).code).toBe("AMOUNT_OVERFLOW")
		expect(error(res).message).toContain('"Fund" on 2026-01-07')
		expect((await ledgerSize(traj)).transactions).toBe(5)
	})

	it("replays a duplicate external reference without asking what its date does to a Balance", async () => {
		const { home, traj } = await chartHome()
		const ref = ["--external-ref", "bank:1"]
		expect((await add(traj, "Equity", "Home", MOST, "2026-01-05", ...ref)).code).toBe(0)
		plant(home, "Equity", "Home", "1.00", "2026-01-06")
		expect((await add(traj, "Equity", "Home", MOST, "2026-01-05", ...ref)).code).toBe(0)
	})
})

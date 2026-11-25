import { describe, expect, it } from "bun:test"
import { chartHome } from "./account-value-support"
import { plant } from "./plant-test-support"
import { csv, errorOf, HEADER, ledgerSize, row } from "./tx-import-test-support"
import { cli } from "./tx-test-support"

/** The most a Balance can hold, in baht: 2^53 - 1 satang. */
const MOST = "90071992547409.91"

/** One CSV row of the template, with the cells a test varies. */
const line = (date: string, from: string, to: string, amount: string, ref: string) =>
	row([date, from, to, amount, "", ref, ""])

async function importing(lines: readonly string[], ...more: string[]) {
	const { home, traj } = await chartHome()
	const res = await cli(home)([
		"tx",
		"import",
		csv(home, "statement.csv", [HEADER, ...lines]),
		...more,
		"--json",
	])
	return { home, traj, res }
}

const rowsOf = (res: { err: string; out: string }) => errorOf(res).details.rows

describe("tx import refuses a batch with a row that leaves a Balance unreadable", () => {
	it("refuses the whole import, names the row in the middle, and writes nothing", async () => {
		const { traj, res } = await importing([
			line("2026-01-05", "Equity", "Home", MOST, "r1"),
			line("2026-01-03", "Gains", "Fund", "1.00", "r2"),
			line("2026-01-06", "Equity", "Home", "1.00", "r3"),
			line("2026-01-07", "Gains", "Fund", "2.00", "r4"),
		])
		expect(res.code).not.toBe(0)
		const error = errorOf(res)
		expect(error.code).toBe("AMOUNT_OVERFLOW")
		expect(error.hint).toContain("Fix line 4 first")
		expect(rowsOf(res)).toHaveLength(1)
		expect(rowsOf(res)[0]).toMatchObject({ line: 4, externalRef: "r3", status: "rejected" })
		expect(rowsOf(res)[0]!.reason.path).toBe("line.4.to")
		expect(rowsOf(res)[0]!.reason.message).toContain('the Balance of "Home" on 2026-01-06')
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("names the row whose date begins the overflowing stretch, whatever order the rows are listed in", async () => {
		const { res } = await importing([
			line("2026-01-06", "Equity", "Home", "1.00", "r1"),
			line("2026-01-05", "Equity", "Home", MOST, "r2"),
		])
		expect(rowsOf(res).map((rejected: { line: number }) => rejected.line)).toEqual([2])
	})

	it("lists every row that leaves a Balance unreadable, not only the first", async () => {
		const { res } = await importing([
			line("2026-01-05", "Equity", "Home", MOST, "r1"),
			line("2026-01-06", "Equity", "Home", "1.00", "r2"),
			line("2026-01-05", "Gains", "Fund", MOST, "r3"),
			line("2026-01-08", "Gains", "Fund", "1.00", "r4"),
		])
		expect(rowsOf(res).map((rejected: { line: number }) => rejected.line)).toEqual([3, 5])
	})

	it("refuses a dry run the same way, and a batch whose rows stay in range is accepted", async () => {
		const bad = [
			line("2026-01-05", "Equity", "Home", MOST, "r1"),
			line("2026-01-06", "Equity", "Home", "1.00", "r2"),
		]
		expect(errorOf((await importing(bad, "--dry-run")).res).code).toBe("AMOUNT_OVERFLOW")
		const { traj, res } = await importing([
			line("2026-01-05", "Equity", "Home", MOST, "r1"),
			line("2026-01-06", "Home", "Food", "1.00", "r2"),
			line("2026-01-07", "Food", "Home", "1.00", "r3"),
		])
		expect(res.code).toBe(0)
		expect((await ledgerSize(traj)).transactions).toBe(3)
	})

	it("accepts a batch that shrinks an overflow the ledger already holds", async () => {
		const { home, traj } = await chartHome()
		plant(home, "Equity", "Fund", MOST, "2026-01-05")
		plant(home, "Equity", "Fund", "1.00", "2026-01-06")
		const file = csv(home, "cure.csv", [HEADER, line("2026-01-05", "Fund", "Gains", "0.50", "r1")])
		expect((await cli(home)(["tx", "import", file, "--json"])).code).toBe(0)
		expect((await ledgerSize(traj)).transactions).toBe(3)
	})

	it("names the row that pushed the Balance over, not a later row of its date that lowered it", async () => {
		const { home, traj } = await chartHome()
		const added = ["tx", "add", "--from", "Equity", "--to", "Home", "--amount", MOST]
		expect((await traj([...added, "--date", "2026-01-05", "--json"])).code).toBe(0)
		const file = csv(home, "same-date.csv", [
			HEADER,
			line("2026-01-07", "Gains", "Home", "1.00", "r1"),
			line("2026-01-07", "Home", "Food", "0.01", "r2"),
		])
		const res = await cli(home)(["tx", "import", file, "--json"])
		expect(rowsOf(res).map((rejected: { line: number }) => rejected.line)).toEqual([2])
		expect(rowsOf(res)[0]!.reason.message).toContain('the Balance of "Home" on 2026-01-07')
	})
})

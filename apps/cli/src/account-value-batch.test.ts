import { describe, expect, it } from "bun:test"
import { chartHome, parsed, type ValuedBatch, value } from "./account-value-support"
import { cli, ledgerSize } from "./tx-test-support"

type Entry = { account: string; date: string; value: string }
const doc = (values: Entry[], against = "Gains") => JSON.stringify({ against, values })
const fail = (res: { err: string }) => JSON.parse(res.err.trim().split("\n").at(-1)!).error

describe("account value --file", () => {
	it("applies a batch over three dates in date order, each against the Balance the earlier ones leave", async () => {
		const { home, traj } = await chartHome()
		const text = doc([
			{ account: "Fund", date: "2026-03-20", value: "300.00" },
			{ account: "Home", date: "2026-02-15", value: "700.00" },
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
		])
		const res = await cli(home, text)(["account", "value", "--file", "-", "--json"])
		expect(res.code).toBe(0)
		const out = parsed<ValuedBatch>(res)
		expect(out.values.map((row) => [row.date, row.account.name, row.index])).toEqual([
			["2026-01-10", "Fund", 2],
			["2026-02-15", "Home", 1],
			["2026-03-20", "Fund", 0],
		])
		const last = out.values[2]!
		expect([last.before, last.difference]).toEqual(["100.00", "200.00"])
		expect(out.counts).toEqual({ added: 3, unchanged: 0 })
		expect(await ledgerSize(traj)).toEqual({ transactions: 3, postings: 6 })
	})

	it("orders entries on one date by account id, not by the order they were listed", async () => {
		const { home } = await chartHome()
		const text = doc([
			{ account: "Home", date: "2026-02-01", value: "5.00" },
			{ account: "Fund", date: "2026-02-01", value: "6.00" },
		])
		const out = parsed<ValuedBatch>(
			await cli(home, text)(["account", "value", "--file", "-", "--json"]),
		)
		expect(out.values.map((row) => row.account.name)).toEqual(["Fund", "Home"])
	})

	it("counts an entry whose Balance already is the value as unchanged and writes nothing for it", async () => {
		const { home, traj } = await chartHome()
		await value(traj, "Fund", "100.00", "2026-01-10")
		const text = doc([
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
			{ account: "Fund", date: "2026-02-10", value: "150.00" },
		])
		const res = await cli(home, text)(["account", "value", "--file", "-", "--json"])
		const out = parsed<ValuedBatch>(res)
		expect(out.counts).toEqual({ added: 1, unchanged: 1 })
		expect(out.values[0]).toMatchObject({
			status: "unchanged",
			transaction: null,
			difference: "0.00",
		})
		expect(await ledgerSize(traj)).toEqual({ transactions: 2, postings: 4 })
	})

	it("rolls everything back and lists every refused entry in details.values", async () => {
		const { home, traj } = await chartHome()
		const text = doc([
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
			{ account: "Nobody", date: "2026-02-10", value: "1.00" },
			{ account: "Home", date: "2026-02-31", value: "1.00" },
			{ account: "Home", date: "2026-03-01", value: "nope" },
		])
		const res = await cli(home, text)(["account", "value", "--file", "-", "--json"])
		expect(res.code).toBe(3)
		const error = fail(res)
		expect(error.code).toBe("UNKNOWN_ACCOUNT")
		expect(error.hint).toStartWith("Fix document.values.1 first:")
		expect(error.path).toBe("document.values.1.account")
		expect(error.details.values.map((row: { index: number }) => row.index)).toEqual([1, 2, 3])
		expect(error.details.values[2].reason).toMatchObject({
			code: "invalid_input",
			path: "document.values.3.value",
		})
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses two values for one account and date", async () => {
		const { home, traj } = await chartHome()
		const text = doc([
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
			{ account: "Fund", date: "2026-01-10", value: "200.00" },
		])
		const res = await cli(home, text)(["account", "value", "--file", "-", "--json"])
		expect(res.code).toBe(2)
		expect(fail(res).details.values.map((row: { index: number }) => row.index)).toEqual([1])
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses a batch whose against is not income or equity once, at document.against", async () => {
		const { home } = await chartHome()
		const text = doc([{ account: "Fund", date: "2026-01-10", value: "1.00" }], "Food")
		const res = await cli(home, text)(["account", "value", "--file", "-", "--json"])
		expect(res.code).toBe(3)
		expect(fail(res)).toMatchObject({ code: "valuation_against_invalid", path: "document.against" })
	})

	it("rolls a dry run back and states minted ids as null", async () => {
		const { home, traj } = await chartHome()
		const text = doc([{ account: "Fund", date: "2026-01-10", value: "1.00" }])
		const res = await cli(home, text)(["account", "value", "--file", "-", "--dry-run", "--json"])
		const out = parsed<ValuedBatch>(res)
		expect(out.dryRun).toBe(true)
		expect(out.values[0]?.transaction?.id).toBeNull()
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("carries the later-valuation note on the entry it belongs to", async () => {
		const { home, traj } = await chartHome()
		await value(traj, "Fund", "1500.00", "2026-04-01")
		const text = doc([{ account: "Fund", date: "2026-03-01", value: "1000.00" }])
		const out = parsed<ValuedBatch>(
			await cli(home, text)(["account", "value", "--file", "-", "--json"]),
		)
		expect(out.values[0]?.notes[0]).toContain("2026-04-01")
	})

	it("refuses the document beside the flag form", async () => {
		const { traj } = await chartHome()
		const res = await traj(["account", "value", "Fund", "--file", "-", "--json"])
		expect(res.code).toBe(2)
		expect(fail(res).code).toBe("invalid_input")
	})
})

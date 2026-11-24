import { describe, expect, it } from "bun:test"
import { balanceOf, chartHome, parsed, type Valued, value } from "./account-value-support"
import { ledgerSize } from "./tx-test-support"

describe("account value", () => {
	it("writes the difference, memoed, and reports before, value and difference", async () => {
		const { traj, chart } = await chartHome()
		const res = await value(traj, "Fund", "1500.00", "2026-03-01")
		expect(res.code).toBe(0)
		const out = parsed<Valued>(res)
		expect(out).toMatchObject({
			dryRun: false,
			status: "added",
			account: { id: chart.Fund.id, name: "Fund" },
			against: { id: chart.Gains.id, name: "Gains" },
			date: "2026-03-01",
			before: "0.00",
			value: "1500.00",
			difference: "1500.00",
			notes: [],
		})
		expect(out.transaction?.memo).toBe("Valued at 1500.00")
		expect(out.transaction?.postings.map((p) => p.amount)).toEqual(["1500.00", "-1500.00"])
		expect(await ledgerSize(traj)).toEqual({ transactions: 1, postings: 2 })
	})

	it("leaves `traj balance` stating exactly the value at that date, going up and down", async () => {
		const { traj } = await chartHome()
		await value(traj, "Fund", "1500.00", "2026-03-01")
		expect(await balanceOf(traj, "Fund", "2026-03-01")).toBe("1500.00")
		const down = parsed<Valued>(await value(traj, "Fund", "900.25", "2026-03-10", "Equity"))
		expect(down).toMatchObject({ before: "1500.00", difference: "-599.75" })
		expect(await balanceOf(traj, "Fund", "2026-03-10")).toBe("900.25")
		expect(await balanceOf(traj, "Equity", "2026-03-10")).toBe("599.75")
	})

	it("states a liability as what it owes: more owed credits it, less owed debits it", async () => {
		const { traj } = await chartHome()
		const up = parsed<Valued>(await value(traj, "Loan", "800.00", "2026-03-01"))
		expect(up).toMatchObject({ before: "0.00", value: "800.00", difference: "800.00" })
		expect(up.transaction?.postings.map((p) => p.amount)).toEqual(["-800.00", "800.00"])
		expect(await balanceOf(traj, "Loan", "2026-03-01")).toBe("-800.00")
		const down = parsed<Valued>(await value(traj, "Loan", "300.00", "2026-03-02"))
		expect(down).toMatchObject({ before: "800.00", difference: "-500.00" })
		expect(await balanceOf(traj, "Loan", "2026-03-02")).toBe("-300.00")
	})

	it("reads the Balance at the date, inclusive, so a later transaction does not count", async () => {
		const { traj } = await chartHome()
		await value(traj, "Fund", "1000.00", "2026-03-10")
		const earlier = parsed<Valued>(await value(traj, "Fund", "400.00", "2026-03-01"))
		expect(earlier).toMatchObject({ before: "0.00", difference: "400.00" })
		const same = parsed<Valued>(await value(traj, "Fund", "1000.00", "2026-03-10"))
		expect(same.status).toBe("added")
		expect(same.before).toBe("1400.00")
	})

	it("writes nothing and exits 0 when the value already is the Balance", async () => {
		const { traj } = await chartHome()
		await value(traj, "Fund", "1500.00", "2026-03-01")
		const res = await value(traj, "Fund", "1500.00", "2026-03-01")
		expect(res.code).toBe(0)
		expect(parsed<Valued>(res)).toMatchObject({
			status: "unchanged",
			before: "1500.00",
			difference: "0.00",
			transaction: null,
			notes: [],
		})
		expect(await ledgerSize(traj)).toEqual({ transactions: 1, postings: 2 })
	})

	it("executes under --dry-run, states a minted id as null, and rolls the write back", async () => {
		const { traj } = await chartHome()
		const res = await value(traj, "Fund", "250.00", "2026-03-01", "Gains", "--dry-run")
		expect(res.code).toBe(0)
		const out = parsed<Valued>(res)
		expect(out).toMatchObject({ dryRun: true, status: "added", difference: "250.00" })
		expect(out.transaction?.id).toBeNull()
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("names a later valuation and what this write moves it by", async () => {
		const { traj } = await chartHome()
		const later = parsed<Valued>(await value(traj, "Fund", "1500.00", "2026-04-01"))
		const out = parsed<Valued>(await value(traj, "Fund", "1000.00", "2026-03-01"))
		expect(out.notes).toHaveLength(1)
		expect(out.notes[0]).toContain("2026-04-01")
		expect(out.notes[0]).toContain("valued at 1500.00")
		expect(out.notes[0]).toContain(later.transaction!.id!)
		expect(out.notes[0]).toContain("by 1000.00")
		expect(out.notes[0]).toContain("becomes 2500.00")
	})

	it("names no later valuation that a Reversal withdrew", async () => {
		const { traj } = await chartHome()
		const later = parsed<Valued>(await value(traj, "Fund", "1500.00", "2026-04-01"))
		const voided = await traj([
			"tx",
			"void",
			later.transaction!.id!,
			"--date",
			"2026-04-01",
			"--json",
		])
		expect(voided.code).toBe(0)
		const out = parsed<Valued>(await value(traj, "Fund", "1000.00", "2026-03-01"))
		expect(out.notes).toEqual([])
	})

	it("names no valuation of another account, nor one that is not later", async () => {
		const { traj } = await chartHome()
		await value(traj, "Home", "9000.00", "2026-04-01")
		await value(traj, "Fund", "100.00", "2026-02-01")
		const out = parsed<Valued>(await value(traj, "Fund", "1000.00", "2026-03-01"))
		expect(out.notes).toEqual([])
	})
})

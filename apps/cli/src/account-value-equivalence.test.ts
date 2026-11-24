import { describe, expect, it } from "bun:test"
import { oraclePlan } from "./account/value/oracle.test-support"
import { planValues } from "./account/value/plan"
import type { ValueRequest } from "./account/value/types"
import { chartHome, value } from "./account-value-support"
import { isAppError } from "./errors"
import { mustOpen } from "./store/testing"
import type { PlannedRead } from "./store/tx-planning"
import type { Traj } from "./tx-test-support"

type Entry = { account: string; date: string; value: string }

const requestOf = (values: readonly Entry[]): ValueRequest => ({
	against: "Gains",
	entries: values.map((entry, index) => ({ ...entry, index })),
	path: (index, field) => `document.values.${index}.${field}`,
	againstPath: "document.against",
	batch: true,
})

/** What the plan reads, taken inside the one write a real plan would read it in. */
function readOf(home: string): PlannedRead {
	let read: PlannedRead | undefined
	const store = mustOpen(home)
	store.writePlanned(
		(seen) => {
			read = seen
			return { writes: [], value: null }
		},
		{ dryRun: true },
	)
	store.close()
	return read!
}

/** A transaction a person recorded with `tx add`, dated between the dates a batch will state. */
async function own(traj: Traj, from: string, to: string, amount: string, date: string) {
	const flags = ["--from", from, "--to", to, "--amount", amount, "--date", date]
	expect((await traj(["tx", "add", ...flags, "--json"])).code).toBe(0)
}

/** The plan the running Balance makes and the plan the full rescan makes, for one request. */
function bothPlans(home: string, values: readonly Entry[]) {
	const request = requestOf(values)
	const read = readOf(home)
	return { fast: planValues(request)(read), slow: oraclePlan(request, read) }
}

describe("account value --file keeps each entry's Balance as it rescanned the Ledger", () => {
	it("plans a mixed batch exactly as the full rescan does", async () => {
		const { home, traj } = await chartHome()
		await value(traj, "Fund", "100.00", "2026-01-10")
		await own(traj, "Equity", "Fund", "25.00", "2026-02-05")
		await own(traj, "Fund", "Food", "10.00", "2026-03-05")
		await own(traj, "Equity", "Home", "300.00", "2026-02-20")
		await own(traj, "Loan", "Food", "40.00", "2026-02-15")
		await value(traj, "Fund", "500.00", "2026-06-01")
		await value(traj, "Loan", "90.00", "2026-05-01")
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-04-01", value: "300.00" },
			{ account: "Home", date: "2026-02-25", value: "700.00" },
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
			{ account: "Fund", date: "2026-03-01", value: "200.00" },
			{ account: "Loan", date: "2026-03-01", value: "60.00" },
			{ account: "Home", date: "2026-02-10", value: "50.00" },
			{ account: "Home", date: "2026-03-15", value: "700.00" },
			{ account: "Fund", date: "2026-02-01", value: "120.50" },
			{ account: "Loan", date: "2026-01-01", value: "30.00" },
			{ account: "Fund", date: "2026-02-28", value: "0.00" },
		])
		expect(isAppError(fast)).toBe(false)
		expect(fast).toEqual(slow)
		const rows = isAppError(fast) ? [] : fast.value.rows
		expect(rows.some((row) => row.write === null)).toBe(true)
		expect(rows.some((row) => row.notes.length > 0)).toBe(true)
		expect(rows.some((row) => row.account.name === "Loan" && row.write !== null)).toBe(true)
	})

	it("reads an entry's Balance with the transactions that sit between its date and the earlier entry's", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "70.00", "2026-01-15")
		await own(traj, "Fund", "Food", "5.00", "2026-01-20")
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-31", value: "100.00" },
			{ account: "Fund", date: "2026-01-10", value: "10.00" },
			{ account: "Fund", date: "2026-01-17", value: "80.00" },
		])
		expect(fast).toEqual(slow)
		const rows = isAppError(fast) ? [] : fast.value.rows
		expect(rows.map((row) => [row.date, row.before])).toEqual([
			["2026-01-10", 0],
			["2026-01-17", 8000],
			["2026-01-31", 7500],
		])
	})

	it("refuses a batch with the same envelope the full rescan gives", async () => {
		const { home } = await chartHome()
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
			{ account: "Nobody", date: "2026-02-10", value: "1.00" },
			{ account: "Fund", date: "2026-01-10", value: "5.00" },
			{ account: "Loan", date: "2026-03-01", value: "-2.00" },
		])
		expect(isAppError(fast)).toBe(true)
		expect(fast).toEqual(slow)
	})
})

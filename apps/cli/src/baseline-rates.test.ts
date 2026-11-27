import { describe, expect, it } from "bun:test"
import { RATES_ACCOUNTS, RATES_AS_OF, ratesFixtureHome } from "./baseline-rates-fixture"
import { capture } from "./test-support"

type Row = {
	account: { id: string; name: string }
	type: "income" | "expense"
	archived: boolean
	firstMonth: string
	lastMonth: string
	monthsWithActivity: number
	total: string
	frequency: "monthly" | "yearly"
	amount: string
	start: string
	inTemplate: boolean
	leftOutBecause?: string
}

type Rates = {
	asOf: string
	months: number
	window: { from: string; to: string }
	covered: { from: string; to: string } | null
	monthsCovered: number
	firstTransactionDate: string | null
	noTransactionsBefore: boolean
	currency: string
	rounding: string
	rows: Row[]
	totals: { type: string; total: string; monthly: string | null }[]
	hint?: string
}

async function read(home: string, ...args: string[]): Promise<Rates> {
	const res = await capture(["baseline", "rates", "--as-of", RATES_AS_OF, ...args, "--json"], {
		TRAJ_HOME: home,
	})
	expect(res.code).toBe(0)
	expect(res.err).toBe("")
	return JSON.parse(res.out) as Rates
}

/** One row by its Account's name, so an assertion does not depend on the row order. */
function named(data: Rates, name: string): Row {
	const row = data.rows.find((entry) => entry.account.name === name)
	if (row === undefined) throw new Error(`no ${name} row`)
	return row
}

describe("baseline rates", () => {
	it("states the window, the record it covers and the rounding rule", async () => {
		const data = await read(ratesFixtureHome())
		expect(data.asOf).toBe(RATES_AS_OF)
		expect(data.months).toBe(12)
		expect(data.window).toEqual({ from: "2025-11-01", to: "2026-10-31" })
		expect(data.covered).toEqual({ from: "2025-11-01", to: "2026-10-31" })
		expect(data.monthsCovered).toBe(12)
		expect(data.firstTransactionDate).toBe("2025-10-01")
		expect(data.noTransactionsBefore).toBe(false)
		expect(data.currency).toBe("THB")
		expect(data.rounding).toBe("half-away-from-zero")
		expect(data.hint).toBeUndefined()
	})

	it("states each income and expense Account's total and run-rate, hand-computed", async () => {
		const data = await read(ratesFixtureHome())
		expect(named(data, "Salary")).toMatchObject({
			account: { id: RATES_ACCOUNTS.salary, name: "Salary" },
			type: "income",
			total: "600000.00",
			frequency: "monthly",
			amount: "50000.00",
			start: RATES_AS_OF,
			inTemplate: true,
		})
		expect(named(data, "Rent")).toMatchObject({
			type: "expense",
			total: "180000.00",
			amount: "15000.00",
			firstMonth: "2025-11",
			lastMonth: "2026-10",
			monthsWithActivity: 12,
		})
		expect(named(data, "Food")).toMatchObject({
			total: "100000.01",
			amount: "8333.33",
			monthsWithActivity: 3,
			firstMonth: "2025-11",
			lastMonth: "2026-07",
		})
		expect(named(data, "Fees")).toMatchObject({ total: "0.06", amount: "0.01" })
		expect(named(data, "Repair")).toMatchObject({
			total: "4000.00",
			frequency: "monthly",
			amount: "333.33",
			firstMonth: "2026-05",
			lastMonth: "2026-08",
		})
	})

	it("states a yearly row with the whole amount and the next 1 March", async () => {
		expect(named(await read(ratesFixtureHome()), "Premium")).toMatchObject({
			total: "24000.00",
			frequency: "yearly",
			amount: "24000.00",
			start: "2027-03-01",
			monthsWithActivity: 1,
			inTemplate: true,
		})
	})

	it("states a negative and a closed row, marks them left out, and keeps their totals", async () => {
		const data = await read(ratesFixtureHome())
		expect(named(data, "Gadgets")).toMatchObject({
			total: "-3000.00",
			amount: "-250.00",
			inTemplate: false,
			leftOutBecause: "negative",
		})
		expect(named(data, "Old hobby")).toMatchObject({
			archived: true,
			total: "100.00",
			frequency: "yearly",
			amount: "100.00",
			inTemplate: false,
			leftOutBecause: "archived",
		})
		expect(data.totals).toEqual([
			{ type: "income", total: "600000.00", monthly: "50000.00" },
			{ type: "expense", total: "305100.07", monthly: "25425.01" },
		])
	})

	it("states no row for an Account with no activity, a transfer or a loan principal", async () => {
		const data = await read(ratesFixtureHome())
		expect(data.rows.map((row) => row.account.name)).toEqual([
			"Fees",
			"Food",
			"Gadgets",
			"Old hobby",
			"Premium",
			"Rent",
			"Repair",
			"Salary",
		])
		for (const absent of ["Cash", "Savings", "Loan", "Opening"]) {
			expect(data.rows.map((row) => row.account.name)).not.toContain(absent)
		}
	})

	it("prints the rows, the totals and the rounding rule for a person", async () => {
		const res = await capture(["baseline", "rates", "--as-of", RATES_AS_OF], {
			TRAJ_HOME: ratesFixtureHome(),
		})
		expect(res.code).toBe(0)
		expect(res.out).toContain("rates (8 rows)")
		expect(res.out).toContain("Salary")
		expect(res.out).toContain("no: refunds exceed it")
		expect(res.out).toContain("no: closed")
		expect(res.out).toContain("totals (2 rows)")
		expect(res.out).toContain("Amounts are rounded half away from zero to the satang.")
	})
})

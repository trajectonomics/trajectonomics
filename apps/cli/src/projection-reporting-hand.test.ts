import { describe, expect, it } from "bun:test"
import { minorOf } from "./projection/cashflow-totals"
import type { ProjectionRunView } from "./projection/run-view"
import { projection } from "./projection/testing"
import { REPORTING_AS_OF, REPORTING_HORIZON } from "./projection-reporting-plan"
import { reportingHome } from "./projection-reporting-support"
import { runBody, tableOf } from "./projection-run-support"

/*
 * The Reporting figures are sim ADR 0034 case A worked by hand (cli ADR-0086): pay 1,000.00 on the
 * 30th from 2026-11-30 and rent 600.00 on the 1st from 2026-12-01, over a Savings Account that holds
 * nothing, from 2026-11-15 to 2027-02-10.
 */

const FLAGS = [
	"--scenario",
	"reporting",
	"--as-of",
	REPORTING_AS_OF,
	"--horizon",
	REPORTING_HORIZON,
]

const ZERO_TOTALS = {
	tax: "0.00",
	withdrawals: "0.00",
	"not funded": "0.00",
	unmet: "0.00",
}

/** One span's nine totals, by section. */
function totalsOf(
	body: ProjectionRunView,
	name: "cashflowYearTotals" | "cashflowMonthTotals",
	where: { year: number; month?: string },
): Record<string, string> {
	return Object.fromEntries(
		tableOf(body, name)
			.rows.filter(
				(row) =>
					row.year === where.year &&
					(where.month === undefined || ("month" in row && row.month === where.month)),
			)
			.map((row) => [row.total, row.amount]),
	)
}

/** Every span's totals rows, years and months, grouped by the span they name. */
function allTotals(body: ProjectionRunView): { total: string; amount: string }[][] {
	const groups = new Map<string, { total: string; amount: string }[]>()
	for (const row of [
		...tableOf(body, "cashflowYearTotals").rows,
		...tableOf(body, "cashflowMonthTotals").rows,
	]) {
		const key = `${row.year}|${row.from}`
		const found = groups.get(key)
		if (found === undefined) groups.set(key, [row])
		else found.push(row)
	}
	return [...groups.values()]
}

describe("projection run --breakdown-years: sim ADR 0034 case A by hand", () => {
	it("states the two calendar years and their nine totals", async () => {
		const home = await reportingHome()
		const body = runBody(await projection(home, ["run", ...FLAGS, "--breakdown-years"]))
		expect(totalsOf(body, "cashflowYearTotals", { year: 2026 })).toEqual({
			"money in": "2600.00",
			drawn: "600.00",
			spending: "600.00",
			saving: "0.00",
			"left over": "2000.00",
			...ZERO_TOTALS,
		})
		expect(totalsOf(body, "cashflowYearTotals", { year: 2027 })).toEqual({
			"money in": "2200.00",
			drawn: "1200.00",
			spending: "1200.00",
			saving: "0.00",
			"left over": "1000.00",
			...ZERO_TOTALS,
		})
	})

	it("states the first year's lines in the engine's order", async () => {
		const home = await reportingHome()
		const body = runBody(await projection(home, ["run", ...FLAGS, "--breakdown-years"]))
		const year = { year: 2026, from: "2026-11-15", to: "2026-12-31", partial: true }
		expect(tableOf(body, "cashflowYears").rows.filter((line) => line.year === 2026)).toEqual([
			{ ...year, group: "income", id: "pay", account: null, category: null, amount: "2000.00" },
			{ ...year, group: "expense", id: "rent", account: null, category: null, amount: "600.00" },
			{ ...year, group: "category", id: null, account: null, category: null, amount: "600.00" },
			{
				...year,
				group: "drawn",
				id: null,
				account: "0194a000-0012-7000-8000-000000000012",
				category: null,
				amount: "600.00",
			},
			{
				...year,
				group: "surplus",
				id: null,
				account: "0194a000-0012-7000-8000-000000000012",
				category: null,
				amount: "2000.00",
			},
		])
	})

	it("states one year from 1 November with --year-start 11", async () => {
		const home = await reportingHome()
		const body = runBody(
			await projection(home, ["run", ...FLAGS, "--breakdown-years", "--year-start", "11"]),
		)
		expect(body.yearStart).toBe(11)
		expect(tableOf(body, "cashflowYearTotals").rows.map((row) => row.year)).toEqual(
			Array(9).fill(2026),
		)
		expect(totalsOf(body, "cashflowYearTotals", { year: 2026 })).toEqual({
			"money in": "4800.00",
			drawn: "1800.00",
			spending: "1800.00",
			saving: "0.00",
			"left over": "3000.00",
			...ZERO_TOTALS,
		})
	})
})

describe("projection run --breakdown-months: sim ADR 0034 case A by hand", () => {
	it("states the months of the first year and of 2027", async () => {
		const home = await reportingHome()
		const first = runBody(await projection(home, ["run", ...FLAGS, "--breakdown-months", "first"]))
		expect(tableOf(first, "cashflowMonths").rows.map((row) => row.month)).toEqual([
			"2026-11",
			"2026-11",
			"2026-12",
			"2026-12",
			"2026-12",
			"2026-12",
			"2026-12",
		])
		expect(totalsOf(first, "cashflowMonthTotals", { year: 2026, month: "2026-11" })).toEqual({
			"money in": "1000.00",
			drawn: "0.00",
			spending: "0.00",
			saving: "0.00",
			"left over": "1000.00",
			...ZERO_TOTALS,
		})
		expect(totalsOf(first, "cashflowMonthTotals", { year: 2026, month: "2026-12" })).toEqual({
			"money in": "1600.00",
			drawn: "600.00",
			spending: "600.00",
			saving: "0.00",
			"left over": "1000.00",
			...ZERO_TOTALS,
		})
		const year = runBody(await projection(home, ["run", ...FLAGS, "--breakdown-months", "2027"]))
		expect(year.yearStart).toBe(1)
		expect(totalsOf(year, "cashflowMonthTotals", { year: 2027, month: "2027-02" })).toEqual({
			"money in": "600.00",
			drawn: "600.00",
			spending: "600.00",
			saving: "0.00",
			"left over": "0.00",
			...ZERO_TOTALS,
		})
	})

	it("holds money in plus unmet against the other sections for every span", async () => {
		const home = await reportingHome()
		const body = runBody(
			await projection(home, ["run", ...FLAGS, "--breakdown-years", "--breakdown-months", "first"]),
		)
		for (const totals of allTotals(body)) {
			const amount = (total: string) =>
				minorOf(totals.find((row) => row.total === total)?.amount ?? "0.00", "THB")
			const inPlusUnmet = amount("money in") + amount("unmet")
			const out = amount("tax") + amount("spending") + amount("saving") + amount("left over")
			expect(inPlusUnmet).toBe(out)
		}
	})
})

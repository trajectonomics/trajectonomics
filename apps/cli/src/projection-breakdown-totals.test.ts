import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { CASHFLOW_TOTALS, type CashflowTotal } from "./projection/cashflow-totals-view"
import type { ProjectionRunView } from "./projection/run-view"
import { projection } from "./projection/testing"
import { blockAmount, FLAGS, satang, YEAR } from "./projection-breakdown-hand"
import { breakdownHome } from "./projection-breakdown-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * `projection run --breakdown`'s section totals (cli ADR-0058, addendum). Each year's nine totals are in
 * the JSON table `cashflowTotals` and in the human block, both from one function. Three plans pin the
 * arithmetic by hand: a normal year, a Shortfall year and a surplus that a cap splits across two
 * Accounts. Every hand figure below is in THB, read from the plan (breakdown-plan.ts) or from the
 * engine's own line, which the identity then checks.
 */

const SHORTFALL = ["--scenario", "breakdown-shortfall", ...FLAGS.slice(2), "--breakdown"]
const SURPLUS = ["--scenario", "breakdown-surplus", ...FLAGS.slice(2), "--breakdown"]

/** Every section total of one Annual roll-up, from the JSON table, by its section name. */
function totalsOf(body: ProjectionRunView, index: number): Record<CashflowTotal, string> {
	const rows = tableOf(body, "cashflowTotals").rows.filter((row) => row.index === index)
	expect(rows.map((row) => row.total)).toEqual([...CASHFLOW_TOTALS])
	return Object.fromEntries(rows.map((row) => [row.total, row.amount])) as Record<
		CashflowTotal,
		string
	>
}

/** The block of one roll-up, by its period, up to the blank line after it. */
function blockOf(text: string, from: string, to: string): string[] {
	const lines = text.split("\n")
	const start = lines.findIndex((line) => line.startsWith(`cash flow ${from} to ${to}`))
	if (start === -1) throw new Error(`the output has no cash-flow block for ${from} to ${to}`)
	const block: string[] = []
	for (const line of lines.slice(start + 1)) {
		if (line === "") break
		block.push(line)
	}
	return block
}

/** A section's amount as the block prints it, in satang; a section the block leaves out is zero. */
function printedOf(block: readonly string[], total: CashflowTotal): number {
	const printed = block.some((line) => line.trimStart().startsWith(`${total} `))
	return printed ? blockAmount(block, total) : 0
}

describe("projection run --breakdown: the section totals, worked out by hand", () => {
	it("a normal year: the totals are the plan's lines summed", async () => {
		const home = await breakdownHome()
		const body = runBody(await projection(home, ["run", ...FLAGS, "--breakdown"]))
		// Money in: income 120000 + withdrawals 3000 (borrow) + drawn 1500 (car, from investment) = 124500.
		// Tax: prepaid 6000 (5% of salary) less the 1800 refund = 4200.
		// Spending: rent 30000 + food 18000 + fees 1200 + car 1500 = 50700 (no unmet, so no more).
		// Saving: invest 36000 + extra 28800 applied = 64800; not funded: extra's 19200 dropped.
		// Left over: bank surplus 4800.
		// Identity: money in + unmet 124500 = tax 4200 + spending 50700 + saving 64800 + left over 4800.
		expect(totalsOf(body, YEAR.index)).toEqual({
			"money in": "124500.00",
			tax: "4200.00",
			withdrawals: "3000.00",
			drawn: "1500.00",
			spending: "50700.00",
			saving: "64800.00",
			"not funded": "19200.00",
			"left over": "4800.00",
			unmet: "0.00",
		})
	})

	it("a Shortfall year: money in + unmet = tax + spending + saving + left over", async () => {
		const home = await breakdownHome()
		const body = runBody(await projection(home, ["run", ...SHORTFALL]))
		// The car is 1000000 on 2026-09-15, so the run runs out that day and holds five months of salary and
		// spending. Income: 5 x 10000 = 50000. Prepaid: 5% of 50000 = 2500, and no settlement falls in the run.
		// Spending: rent 5 x 2500 + food 5 x 1500 + fees 5 x 100 + car 1000000 = 1020500.
		// Saving: 5 months of 5400 applied (invest 3000 + extra 2400) = 27000; not funded: 5 x 7000 planned
		// less 27000 applied = 8000. Drawn: 127000 from the investment Account (the engine's line).
		// Money in: 50000 + 0 withdrawals + 127000 drawn = 177000. Unmet: 1050000 - 177000 = 873000.
		// Identity: 177000 + 873000 = 2500 + 1020500 + 27000 + 0 = 1050000.
		expect(totalsOf(body, YEAR.index)).toEqual({
			"money in": "177000.00",
			tax: "2500.00",
			withdrawals: "0.00",
			drawn: "127000.00",
			spending: "1020500.00",
			saving: "27000.00",
			"not funded": "8000.00",
			"left over": "0.00",
			unmet: "873000.00",
		})
	})

	it("a surplus capped across two Accounts: left over is the sum of both lines", async () => {
		const home = await breakdownHome()
		const body = runBody(await projection(home, ["run", ...SURPLUS]))
		// Salary 30000 a month: income 12 x 30000 = 360000. Prepaid 5% = 18000; settlement -5400, the 2026
		// period's refund (3% of 9 x 30000 = 8100 due, against 5% = 13500 prepaid). Tax = 18000 - 5400 = 12600.
		// Spending 50700 (as the normal year). Saving: invest 36000 + extra 48000 = 84000, none unfunded.
		// Withdrawals 3000 (borrow); drawn 1500 (car). Money in = 360000 + 3000 + 1500 = 364500.
		// Left over: cash opens the year at 499900.01 (the fixture's balance), so its 700000.00 cap takes
		// 200099.99 and the bank takes the rest of the 217200 surplus: 217200 - 200099.99 = 17100.01.
		// Identity: 364500 = 12600 + 50700 + 84000 + 217200.
		expect(totalsOf(body, YEAR.index)).toEqual({
			"money in": "364500.00",
			tax: "12600.00",
			withdrawals: "3000.00",
			drawn: "1500.00",
			spending: "50700.00",
			saving: "84000.00",
			"not funded": "0.00",
			"left over": "217200.00",
			unmet: "0.00",
		})
		const surplus = tableOf(body, "cashflow").rows.filter((row) => row.group === "surplus")
		expect(surplus.map((row) => row.amount)).toEqual(["200099.99", "17100.01"])
		expect(surplus.map((row) => row.account)).toEqual([
			FIXTURE_ACCOUNTS.cash,
			FIXTURE_ACCOUNTS.bank,
		])
	})

	it("holds the identity for every roll-up of a two-year horizon", async () => {
		const home = await breakdownHome()
		const body = runBody(
			await projection(home, [
				"run",
				"--scenario",
				"breakdown",
				"--as-of",
				"2026-03-31",
				"--horizon",
				"2028-03-30",
				"--breakdown",
			]),
		)
		const indexes = [...new Set(tableOf(body, "cashflowTotals").rows.map((row) => row.index))]
		expect(indexes).toEqual([0, 1])
		for (const index of indexes) {
			const totals = totalsOf(body, index)
			const moneyIn = satang(totals["money in"]) + satang(totals.unmet)
			const moneyOut =
				satang(totals.tax) +
				satang(totals.spending) +
				satang(totals.saving) +
				satang(totals["left over"])
			expect(moneyIn).toBe(moneyOut)
		}
	})
})

describe("projection run --breakdown: the JSON totals are the human block's", () => {
	for (const [name, args] of [
		["a normal year", ["run", ...FLAGS, "--breakdown"]],
		["a Shortfall year", ["run", ...SHORTFALL]],
		["a surplus capped across two Accounts", ["run", ...SURPLUS]],
	] as const) {
		it(`prints the same figure as the JSON for ${name}`, async () => {
			const home = await breakdownHome()
			const body = runBody(await projection(home, [...args]))
			const json = totalsOf(body, YEAR.index)
			// A Shortfall ends its roll-up early, so the block's heading takes the period the JSON states.
			const first = tableOf(body, "cashflowTotals").rows[0]
			if (first === undefined) throw new Error("the result has no section totals")
			const human = await capture(["projection", ...args], { TRAJ_HOME: home })
			expect(human.code).toBe(0)
			const block = blockOf(human.out, first.from, first.to)
			for (const total of CASHFLOW_TOTALS) {
				expect(printedOf(block, total)).toBe(satang(json[total]))
			}
		})
	}
})

describe("projection run --breakdown: the schema names the totals", () => {
	it("describes the cashflowTotals table", async () => {
		const res = await capture(["schema", "projection", "run", "--json"])
		expect(res.code).toBe(0)
		expect(res.out).toContain('"cashflowTotals"')
		expect(res.out).toContain("money in")
	})
})

describe("projection run --breakdown: the totals table is JSON only", () => {
	it("is present with the flag and absent without it", async () => {
		const home = await breakdownHome()
		const withFlag = runBody(await projection(home, ["run", ...FLAGS, "--breakdown"]))
		expect(withFlag.tables.map((table) => table.name)).toEqual([
			"annual",
			"cashflow",
			"cashflowTotals",
		])
		const without = runBody(await projection(home, ["run", ...FLAGS]))
		expect(without.tables.map((table) => table.name)).toEqual(["annual"])
	})
})

import { describe, expect, it } from "bun:test"
import { projectionRun } from "./projection-run"

/*
 * The CLI's own `projection run` goldens, parsed by the Dashboard's contract (cli ADR-0058). The goldens
 * are the CLI's bytes, so a field the CLI adds or renames fails here before it reaches the page.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/projection/fixtures/", import.meta.url)

async function golden(name: string): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL(name, CLI_FIXTURES)).text())
}

describe("the projection run contract against the CLI's goldens", () => {
	it("parses --breakdown's output, section totals included", async () => {
		const run = projectionRun.parse(await golden("run-breakdown.output"))
		const totals = run.tables.find((table) => table.name === "cashflowTotals")
		if (totals?.name !== "cashflowTotals") throw new Error("the output has no cashflowTotals table")
		expect(
			totals.rows.filter((row) => row.index === 0).map((row) => [row.total, row.amount]),
		).toEqual([
			["money in", "124500.00"],
			["tax", "4200.00"],
			["withdrawals", "3000.00"],
			["drawn", "1500.00"],
			["spending", "50700.00"],
			["saving", "64800.00"],
			["not funded", "19200.00"],
			["left over", "4800.00"],
			["unmet", "0.00"],
		])
	})

	it("still parses a run without --breakdown, which has no totals table", async () => {
		const run = projectionRun.parse(await golden("run.output"))
		expect(run.tables.map((table) => table.name)).toEqual(["annual"])
	})

	it("parses --accounts' output: each Account's value, nominal and real (cli ADR-0060)", async () => {
		const run = projectionRun.parse(await golden("run-accounts.output"))
		const balances = run.tables.find((table) => table.name === "balances")
		if (balances?.name !== "balances") throw new Error("the output has no balances table")
		const home = balances.rows.filter((row) => row.account === "home")
		expect(home.map((row) => [row.date, row.amount])).toEqual([
			["2027-01-15", "0.00"],
			["2028-01-15", "15225.19"],
			["2029-01-15", "15681.94"],
			["2030-01-15", "16152.40"],
			["2031-01-01", "0.00"],
		])
		// The loan is repaid from the sale, so nothing is owed at the end.
		const loan = balances.rows.filter((row) => row.account === "home-loan")
		expect(loan.at(-1)?.amount).toBe("0.00")
	})

	it("refuses a section the contract does not name", async () => {
		const body = (await golden("run-breakdown.output")) as {
			tables: { name: string; rows?: { total?: string }[] }[]
		}
		const totals = body.tables.find((table) => table.name === "cashflowTotals")
		const first = totals?.rows?.[0]
		if (first === undefined) throw new Error("the output has no section totals")
		first.total = "income"
		expect(projectionRun.safeParse(body).success).toBe(false)
	})
})

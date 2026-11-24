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

	it("parses a run with a fee and a payout: each Account's totals and the plan's fees (cli ADR-0067)", async () => {
		const run = projectionRun.parse(await golden("run-lifetime.output"))
		expect(run.lifetimeFees).toBe("1514.01")
		expect(run.accountLifetimes).toEqual([
			{ account: "fund", lifetimeFees: "1514.01", lifetimePayouts: "4051.89" },
		])
	})

	it("parses a run whose tax years state their walk, brackets and rates (cli ADR-0036)", async () => {
		const run = projectionRun.parse(await golden("run-carry-in.output"))
		const [year] = run.taxYears
		expect(year?.walk).toEqual({
			assessable: "560000.00",
			expenses: "100000.00",
			allowances: "60000.00",
			taxableIncome: "400000.00",
		})
		expect(year?.brackets).toHaveLength(8)
		expect(year).toMatchObject({
			marginalRateBps: 1000,
			toNextBracket: "100000.00",
			effectiveRateBps: 312,
		})
	})

	it("states no total in a run without a fee or a payout", async () => {
		const run = projectionRun.parse(await golden("run.output"))
		expect(run.lifetimeFees).toBeUndefined()
		expect(run.accountLifetimes).toBeUndefined()
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

	it("parses --spending's output: each Rule year's portfolio, amount, rate and action (cli ADR-0063)", async () => {
		const run = projectionRun.parse(await golden("run-spending.output"))
		const rules = run.tables.find((table) => table.name === "spendingRules")
		if (rules?.name !== "spendingRules") throw new Error("the output has no spendingRules table")
		expect(rules.rows.slice(0, 2).map((row) => [row.date, row.amount, row.withdrawalRate])).toEqual(
			[
				["2045-01-01", "11875.23", "3.99"],
				["2046-01-01", "12231.49", "4.19"],
			],
		)
		// The same amounts in today's money, each deflated by the engine at the Rule year's first date (cli ADR-0063).
		expect(rules.rows.slice(0, 2).map((row) => [row.realAmount, row.realPaid])).toEqual([
			["6779.96", "6779.96"],
			["6779.96", "6779.96"],
		])
		expect(rules.rows.map((row) => row.action)).toContain("cut")
		const raised = projectionRun.parse(await golden("run-spending-raise.output"))
		const years = raised.tables.find((table) => table.name === "spendingRules")
		expect(years?.rows.map((row) => row.action)).toEqual(["none", "raise", "raise", "cut", "cut"])
	})

	it("parses --estate's output: the estate and each cost and gift on each roll-up's end (cli ADR-0064)", async () => {
		const run = projectionRun.parse(await golden("run-estate.output"))
		const estate = run.tables.find((table) => table.name === "estate")
		if (estate?.name !== "estate") throw new Error("the output has no estate table")
		expect(estate.rows[2]).toEqual({
			date: "2029-01-15",
			gross: "56310.72",
			debts: "26445.43",
			costs: "1033.57",
			net: "28831.72",
			gifts: "1441.59",
			toHeirs: "27390.13",
			realNet: "26385.10",
			realToHeirs: "25065.84",
		})
		const lines = run.tables.find((table) => table.name === "estateLines")
		if (lines?.name !== "estateLines") throw new Error("the output has no estateLines table")
		expect(lines.rows.filter((row) => row.date === "2029-01-15").map((row) => row.line)).toEqual([
			"settlement",
			"home-selling",
			"temple",
		])
	})

	it("parses the routing plan's output: the echo, the transfers and the entries of the drawn lines (cli ADR-0070)", async () => {
		const run = projectionRun.parse(await golden("run-routing.output"))
		expect(run.routing?.surplus[0]).toEqual({
			entry: 0,
			account: "emergency",
			upTo: { amount: "100000.00", growth: "inflation" },
			share: null,
		})
		expect(run.routing?.surplus[1]).toMatchObject({ entry: 1, account: "funds", share: "50.00" })
		expect(run.routing?.withdraw[1]).toEqual({ entry: 1, account: "funds", downTo: null })
		const annual = run.tables.find((table) => table.name === "annual")
		expect(annual?.rows.map((row) => ("transfers" in row ? row.transfers : undefined))).toEqual([
			"33000.00",
			"0.00",
		])
		const transfers = run.tables.find((table) => table.name === "transfers")
		if (transfers?.name !== "transfers") throw new Error("the output has no transfers table")
		expect(transfers.rows.map((row) => [row.flow, row.amount, row.unmoved])).toEqual([
			["roll-pvd", "30000.00", "0.00"],
			["pay-debt", "3000.00", "6000.00"],
			["pay-debt", "0.00", "1000.00"],
		])
		const cashflow = run.tables.find((table) => table.name === "cashflow")
		if (cashflow?.name !== "cashflow") throw new Error("the output has no cashflow table")
		expect(
			cashflow.rows.filter((row) => row.group === "drawn").map((row) => [row.entry, row.account]),
		).toEqual([
			[0, "emergency"],
			[1, "funds"],
			[2, "emergency"],
		])
		const loans = run.tables.find((table) => table.name === "liabilities")
		if (loans?.name !== "liabilities") throw new Error("the output has no liabilities table")
		expect(loans.rows.filter((row) => row.transferred === "1000.00")).toHaveLength(3)
	})

	it("states no routing and no transfers for a run without the new forms", async () => {
		const run = projectionRun.parse(await golden("run-breakdown.output"))
		expect(run.routing).toBeUndefined()
		expect(run.tables.map((table) => table.name)).not.toContain("transfers")
	})

	it("refuses a routing entry the contract does not name", async () => {
		const body = (await golden("run-routing.output")) as { routing: { surplus: object[] } }
		body.routing.surplus.push({ entry: 9, account: "x", upTo: null, share: null, extra: 1 })
		expect(projectionRun.safeParse(body).success).toBe(false)
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

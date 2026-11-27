import { describe, expect, it } from "bun:test"
import { RATES_ACCOUNTS, RATES_AS_OF, ratesFixtureHome } from "./baseline-rates-fixture"
import { fixtureHome } from "./ledger-fixture"
import { projection } from "./projection/testing"
import { applyScenario, errorOf } from "./scenario-test-support"
import { capture } from "./test-support"

type Flow = {
	id: string
	kind: string
	amount: string | number
	frequency: string
	start?: string
	displayLabel?: string
	earned?: boolean
	category?: string
	growth?: string
}
type Doc = { flows: Flow[]; accounts: unknown[]; cashflow: unknown; economy: unknown }
type Row = {
	account: { id: string; name: string }
	type: "income" | "expense"
	frequency: "monthly" | "yearly"
	amount: string
	start: string
	inTemplate: boolean
}

async function ratesOf(home: string): Promise<{ rows: Row[] }> {
	const res = await capture(["baseline", "rates", "--as-of", RATES_AS_OF, "--json"], {
		TRAJ_HOME: home,
	})
	expect(res.code).toBe(0)
	return JSON.parse(res.out)
}

/** The first full year's income and expense the Streams state: twelve months, or one a year. */
function yearFiguresOf(doc: Doc): { income: number; expense: number } {
	let income = 0
	let expense = 0
	for (const flow of doc.flows) {
		if (flow.kind !== "income" && flow.kind !== "expense") continue
		const one = Number(flow.amount) * (flow.frequency === "annual" ? 1 : 12)
		if (flow.kind === "income") income += one
		else expense += one
	}
	return { income, expense }
}

async function templateOf(home: string, ...args: string[]): Promise<string> {
	const res = await capture(["scenario", "apply", "--template", "--as-of", RATES_AS_OF, ...args], {
		TRAJ_HOME: home,
	})
	expect(res.code).toBe(0)
	return res.out
}

describe("scenario apply --template --from-history", () => {
	it("writes one Stream per carried row, with the Account's id, label and category", async () => {
		const home = ratesFixtureHome()
		const rates = await ratesOf(home)
		const doc = JSON.parse(await templateOf(home, "--from-history")) as Doc
		const carried = rates.rows.filter((row) => row.inTemplate)
		expect(doc.flows).toHaveLength(carried.length)
		for (const row of carried) {
			const flow = doc.flows.find((entry) => entry.id === row.account.id)
			expect(flow).toMatchObject({
				id: row.account.id,
				kind: row.type,
				amount: Math.round(Number(row.amount) * 100),
				frequency: row.frequency === "yearly" ? "annual" : row.frequency,
				start: row.start,
				growth: "inflation",
			})
			expect(flow?.displayLabel).toBe(row.account.name)
			if (row.type === "income") expect(flow?.earned).toBe(true)
			else expect(flow?.category).toBe(row.account.name)
		}
		expect(doc.flows.map((flow) => flow.id)).not.toContain("salary")
		expect(doc.flows.map((flow) => flow.id)).not.toContain("spending")
		const premium = doc.flows.find((flow) => flow.id === RATES_ACCOUNTS.premium)
		expect(premium).toMatchObject({ frequency: "annual", start: "2027-03-01" })
	})

	it("prints the same bytes on a repeat call", async () => {
		const home = ratesFixtureHome()
		expect(await templateOf(home, "--from-history")).toBe(await templateOf(home, "--from-history"))
	})

	it("refuses --from-history without a template and an As-of, with the hint", async () => {
		const res = await capture(["scenario", "apply", "--from-history", "--json"], {
			TRAJ_HOME: ratesFixtureHome(),
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--from-history",
			message: "Builds a template from the Ledger, so it needs --template and --as-of",
			hint: 'Run "traj scenario apply --template --as-of <date> --from-history".',
		})
	})

	it("refuses --months without --from-history", async () => {
		const res = await capture(
			["scenario", "apply", "--template", "--as-of", RATES_AS_OF, "--months", "6", "--json"],
			{ TRAJ_HOME: ratesFixtureHome() },
		)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--months",
			message: "Sets the window --from-history reads, so it needs --from-history",
		})
	})

	it("refuses a window with no income or expense to carry in, naming both commands", async () => {
		const res = await capture(
			["scenario", "apply", "--template", "--as-of", "2026-01-31", "--from-history", "--json"],
			{ TRAJ_HOME: fixtureHome() },
		)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--from-history",
			message: "The Ledger states no income or expense to carry in from 2025-02-01 to 2026-01-31",
			hint: 'Run "traj baseline rates --as-of 2026-01-31" to see what it states, or "traj scenario apply --template --as-of 2026-01-31" for the two zero Streams.',
		})
	})

	it("prints the decimal form: 1000.00 static, 0.00 placeholders, 50000.00 from history", async () => {
		const staticDoc = JSON.parse(
			(
				await capture(["scenario", "apply", "--template", "--decimal"], {
					TRAJ_HOME: ratesFixtureHome(),
				})
			).out,
		) as Doc
		expect(staticDoc.flows[0]?.amount).toBe("1000.00")
		const placeholders = JSON.parse(await templateOf(ratesFixtureHome(), "--decimal")) as Doc
		expect(placeholders.flows.map((flow) => flow.amount)).toEqual(["0.00", "0.00"])
		const history = JSON.parse(
			await templateOf(ratesFixtureHome(), "--from-history", "--decimal"),
		) as Doc
		const salary = history.flows.find((flow) => flow.id === RATES_ACCOUNTS.salary)
		expect(salary?.amount).toBe("50000.00")
	})

	it("applies unchanged, and the first full year matches the Streams", async () => {
		const home = ratesFixtureHome()
		const text = await templateOf(home, "--from-history")
		const doc = JSON.parse(text) as Doc
		const applied = await applyScenario(home, "from-history", text)
		expect(applied.code).toBe(0)
		const run = await projection(home, [
			"run",
			"--scenario",
			"from-history",
			"--as-of",
			RATES_AS_OF,
			"--horizon",
			"2027-11-14",
			"--breakdown",
		])
		expect(run.code).toBe(0)
		const annual = JSON.parse(run.out).tables.find(
			(table: { name: string }) => table.name === "annual",
		)
		const expected = yearFiguresOf(doc)
		const year = annual.rows[0]
		expect(Math.round(Number(year.income) * 100)).toBe(expected.income)
		expect(Math.round(Number(year.expense) * 100)).toBe(expected.expense)
	})
})

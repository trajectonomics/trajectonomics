import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS, fixtureHome } from "./ledger-fixture"
import { AS_OF, HORIZON, projection } from "./projection/testing"
import { acceptedScenarioSchemaVersion, scenarioProblems } from "./scenario/document"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"
import { capture } from "./test-support"

/** The template text `--template --as-of` prints for one data directory. */
async function templateOf(home: string, asOf = AS_OF): Promise<string> {
	const res = await capture(["scenario", "apply", "--template", "--as-of", asOf], {
		TRAJ_HOME: home,
	})
	expect(res.code).toBe(0)
	return res.out
}

/** The Baseline's figures at the As-of, as the CLI states them, read through `baseline show`. */
async function baselineOf(home: string): Promise<{ id: string; kind: string; amount: string }[]> {
	const res = await capture(["baseline", "show", "--as-of", AS_OF, "--json"], { TRAJ_HOME: home })
	expect(res.code).toBe(0)
	return JSON.parse(res.out).rows.map(
		(row: { account: { id: string }; kind: string; amount: string }) => ({
			id: row.account.id,
			kind: row.kind,
			amount: row.amount,
		}),
	)
}

/** Net worth in satang-free integers: assets minus liabilities, the way the Baseline states them. */
function netWorthOf(rows: readonly { kind: string; amount: string }[]): number {
	return rows.reduce((sum, row) => {
		const minor = Math.round(Number(row.amount) * 100)
		return row.kind === "liability" ? sum - minor : sum + minor
	}, 0)
}

describe("scenario apply --template --as-of", () => {
	it("declares every asset and liability Account of the Ledger, with no rate", async () => {
		const home = fixtureHome()
		const document = JSON.parse(await templateOf(home))
		expect(scenarioProblems(document)).toEqual([])
		expect(document.schemaVersion).toBe(acceptedScenarioSchemaVersion())
		const declared = new Map(
			document.accounts.map((account: { id: string; kind: string; rate: number }) => [
				account.id,
				account,
			]),
		)
		for (const row of await baselineOf(home)) {
			expect(declared.get(row.id)).toMatchObject({ kind: row.kind, rate: 0 })
		}
		expect(declared.has(FIXTURE_ACCOUNTS.locked)).toBe(true)
	})

	it("declares a zero-balance leaf Account, and no header Account", async () => {
		const declared = new Set(
			JSON.parse(await templateOf(fixtureHome())).accounts.map(
				(account: { id: string }) => account.id,
			),
		)
		expect(declared.has(FIXTURE_ACCOUNTS.savings)).toBe(true)
		expect(declared.has(FIXTURE_ACCOUNTS.assets)).toBe(false)
	})

	it("states each Baseline balance nowhere in the document, so the balances stay in the Baseline", async () => {
		const home = fixtureHome()
		const text = await templateOf(home)
		for (const row of await baselineOf(home)) expect(text).not.toContain(row.amount)
	})

	it("pre-fills nothing from the clock: the Streams start on the As-of at zero", async () => {
		const document = JSON.parse(await templateOf(fixtureHome()))
		expect(document.flows).toEqual([
			expect.objectContaining({ id: "salary", earned: true, amount: 0, start: AS_OF }),
			expect.objectContaining({ id: "spending", kind: "expense", amount: 0, start: AS_OF }),
		])
	})

	it("is byte-identical on every call and writes nothing to the store", async () => {
		const home = fixtureHome()
		const first = await templateOf(home)
		const second = await templateOf(home)
		expect(second).toBe(first)
		expect(resultOf(await scenario(home, ["list"])).scenarios).toEqual([])
	})

	it("applies its template unchanged, and the projection matches the Baseline every month", async () => {
		const home = fixtureHome()
		const text = await templateOf(home)
		const created = await applyScenario(home, "pre", text)
		expect(created.code).toBe(0)
		expect(resultOf(created).status).toBe("created")

		const res = await projection(home, [
			"run",
			"--scenario",
			"pre",
			"--as-of",
			AS_OF,
			"--horizon",
			HORIZON,
			"--monthly",
		])
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out)
		const figure = netWorthOf(await baselineOf(home))
		const monthly = body.tables.find((table: { name: string }) => table.name === "monthly")
		expect(monthly.rows.length).toBeGreaterThan(1)
		for (const row of monthly.rows) {
			expect(Math.round(Number(row.netWorth) * 100)).toBe(figure)
		}
	})
})

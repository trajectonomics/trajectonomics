import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { purchase, saleOfAll, withdrawal } from "../engine/test-assets"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { oracleAccountWalk } from "./oracle-account-walk"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/**
 * One home bought on 1 Mar 2026 for 3,000,000.00 with a 2,400,000.00 loan drawn that day, held for four
 * years at 3% appreciation against a 5% loan, then sold whole on 1 Jun 2030 for what it is worth that day.
 */
const fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "home", kind: "asset", rate: 300, liquid: false },
		{ id: "mortgage", kind: "liability", rate: 500 },
	],
	balances: { cash: 60_000_000 },
	flows: [
		income("salary", 20_000_000, monthly),
		expense("living", 15_000_000, monthly),
		withdrawal("draw", "mortgage", 240_000_000, { start: "2026-03-01" }),
		purchase("buy", "home", 300_000_000, { start: "2026-03-01" }),
		saleOfAll("sell", "home", { start: "2030-06-01" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2031-01-01",
	resolution: "month",
})

describe("the engine buys, holds and sells one asset as the independent oracle does", () => {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const { projection } = result
	const walk = oracleAccountWalk(fixture, fixture.scenario.flows, fixture.timeline.horizon)

	it("agrees on the accessible net worth after every Occurrence date", () => {
		const rows = new Map(projection.rows.map((row) => [row.date, row.accessibleNetWorth]))
		const compared = [...walk.after].filter(([date]) => rows.has(date))
		expect(compared.length).toBeGreaterThan(60)
		for (const [date, accessible] of compared) expect(BigInt(rows.get(date)!)).toBe(accessible)
	})

	it("holds the home out of accessible net worth until the sale, and sells it whole", () => {
		const before = projection.rows.find((row) => row.date === "2030-05-01")!
		const after = projection.rows.find((row) => row.date === "2030-06-01")!
		const home = (row: typeof before) => row.balances.find((b) => b.account === "home")!.amount
		expect(home(before)).toBeGreaterThan(300_000_000)
		expect(home(after)).toBe(0)
		expect(after.accessibleNetWorth - before.accessibleNetWorth).toBeGreaterThan(300_000_000)
		expect(projection.runsOut).toBeUndefined()
	})
})

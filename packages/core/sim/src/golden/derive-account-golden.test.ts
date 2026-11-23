import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { derivedExpense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { DateString, Derive } from "../types"
import { oracleAccountAt } from "./oracle-account"
import { oraclePlanned } from "./oracle-planned"

/** 1% a year of the home's value, paid each January (ADR 0020). */
const upkeep: Derive = {
	measures: [
		{ id: "value", op: "account", account: "home" },
		{ id: "share", op: "scale", of: "value", num: 100, den: 10_000, rounding: "halfUp" },
	],
	result: "share",
}

const fixture: Fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "home", kind: "asset", rate: 300 },
	],
	balances: { cash: 1_000_000_000, home: 500_000_000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2028-01-01",
	resolution: "day",
	flows: [derivedExpense("upkeep", upkeep, { frequency: "annual", start: "2026-01-01" })],
})

const JANUARIES: readonly DateString[] = ["2026-01-01", "2027-01-01", "2028-01-01"]

describe("a yearly Derived amount on an Account, against the independent oracle", () => {
	it("values the home at each anniversary, exact: 500,000,000, 515,000,000, 530,450,000", () => {
		expect(JANUARIES.map((date) => oracleAccountAt(fixture, "home", date))).toEqual([
			500_000_000n,
			515_000_000n,
			530_450_000n,
		])
	})

	it("plans each January's upkeep at 1% of that value: 5,000,000, 5,150,000, 5,304,500", () => {
		const planned = oraclePlanned(fixture)
		expect(JANUARIES.map((date) => planned.get(date)?.get("upkeep"))).toEqual([
			5_000_000n,
			5_150_000n,
			5_304_500n,
		])
	})

	it("gives the Projection the oracle's cash on each January, cumulative", () => {
		const result = project(fixture.baseline, fixture.scenario, fixture.timeline)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const planned = oraclePlanned(fixture)
		let cash = 1_000_000_000n
		for (const date of JANUARIES) {
			cash -= planned.get(date)?.get("upkeep") ?? 0n
			const row = result.projection.rows.find((item) => item.date === date)
			expect(row?.balances.find((item) => item.account === "cash")?.amount).toBe(Number(cash))
		}
		expect(cash).toBe(984_545_500n)
	})
})

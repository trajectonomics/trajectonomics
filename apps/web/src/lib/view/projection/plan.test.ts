import { describe, expect, test } from "bun:test"
import type { Fi, HouseholdDocument, ProjectionChance, Read } from "../../contract"
import { chanceFixture } from "../chance/fixtures.test-support"
import { fiFixture, REACHABLE, UNREACHABLE } from "../fi/fixtures.test-support"
import { projectionRunFixture } from "./fixtures.test-support"
import { firstAges, planPeople, planStats } from "./plan"

const ARGV = ["projection", "run", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
}

function okRead<T>(data: T): Read<T> {
	return { argv: ARGV, ok: true, data }
}

describe("planPeople", () => {
	test("gives each person of the household the age the first year states for them", () => {
		expect(
			planPeople(HOUSEHOLD, [
				{ person: "me", age: 37 },
				{ person: "partner", age: 35 },
			]),
		).toEqual([
			{ id: "me", age: 37 },
			{ id: "partner", age: 35 },
		])
	})

	test("leaves a person without an age in the first year, and has no one without a household", () => {
		expect(planPeople(HOUSEHOLD, [{ person: "me", age: 37 }])).toEqual([
			{ id: "me", age: 37 },
			{ id: "partner", age: null },
		])
		expect(planPeople(null, [{ person: "me", age: 37 }])).toEqual([])
	})

	test("reads the first year's ages from the projection's own rows", () => {
		const run = projectionRunFixture()
		const rows = run.tables.flatMap((table) => (table.name === "annual" ? table.rows : []))
		const first = rows[0]
		if (first === undefined) throw new Error("the fixture has a year")
		expect(
			firstAges({
				...run,
				tables: [
					{ name: "annual", count: 1, rows: [{ ...first, ages: [{ person: "me", age: 37 }] }] },
				],
			}),
		).toEqual([{ person: "me", age: 37 }])
		expect(firstAges(projectionRunFixture())).toEqual([])
	})
})

describe("planStats", () => {
	test("states the FI month and day, the closing figure in future money and the chance", () => {
		const stats = planStats(
			okRead(fiFixture(REACHABLE)),
			okRead(chanceFixture()),
			projectionRunFixture(),
		)
		expect(stats).toEqual({
			stopWorking: { month: "Mar 2041", date: "1 Mar 2041" },
			runsOut: null,
			closing: { amount: "1550000.00", year: "2028" },
			chance: "87%",
		})
	})

	test("leaves the FI date out when the answer is unreachable, and the chance out when its Read is absent or failed", () => {
		const unreachable: Read<Fi> = okRead(fiFixture(UNREACHABLE.shortfallBeforeStop))
		const failed: Read<ProjectionChance> = {
			argv: ARGV,
			ok: false,
			error: { code: "NO_CHANCE", exitCode: 3, message: "No chance." },
		}
		expect(planStats(unreachable, failed, projectionRunFixture())).toEqual({
			stopWorking: null,
			runsOut: null,
			closing: { amount: "1550000.00", year: "2028" },
			chance: null,
		})
		expect(planStats(undefined, undefined, projectionRunFixture())).toEqual({
			stopWorking: null,
			runsOut: null,
			closing: { amount: "1550000.00", year: "2028" },
			chance: null,
		})
	})

	test("states the month the money runs out, for a plan that states one", () => {
		const stats = planStats(
			okRead(fiFixture(UNREACHABLE.shortfallBeforeStop)),
			undefined,
			projectionRunFixture({ runsOut: { date: "2027-06-15", unmet: "1200.00" } }),
		)
		expect(stats.runsOut).toEqual({ month: "Jun 2027" })
		expect(stats.stopWorking).toBeNull()
	})

	test("leaves the closing figure out when the projection has no year", () => {
		expect(planStats(undefined, undefined, projectionRunFixture({ tables: [] }))).toEqual({
			stopWorking: null,
			runsOut: null,
			closing: null,
			chance: null,
		})
	})
})

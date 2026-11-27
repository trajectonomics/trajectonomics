import { describe, expect, it } from "bun:test"
import { AS_OF, baseFlags, fi, HORIZON, projection, projectionHome } from "./projection/testing"
import { runBody, tableOf } from "./projection-run-support"
import { setHousehold } from "./scenario-household-support"
import { scenario } from "./scenario-test-support"
import { capture } from "./test-support"

/**
 * Each household person's age on projection rows and at the FI date (cli ADR-0048). The household
 * has a holder born June 1990, a partner born February 1992 who joins in September 2026, and a
 * child born June 2026, so every rule below is checked on a monthly row dated on its edge.
 */
const HOUSEHOLD = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 90, joins: "2026-09" },
		{ id: "child", role: "dependent", relation: "child", born: "2026-06", lifeExpectancy: 90 },
	],
	anchors: [],
}

/** One monthly row's ages, by its date. */
function agesAt(rows: readonly { date: string; ages: unknown }[], date: string): unknown {
	const row = rows.find((entry) => entry.date === date)
	if (row === undefined) throw new Error(`no monthly row dated ${date}`)
	return row.ages
}

async function withHousehold(): Promise<string> {
	const home = await projectionHome()
	const set = await setHousehold(home, HOUSEHOLD)
	expect(set.code).toBe(0)
	return home
}

describe("ages on projection rows", () => {
	it("gives each monthly row the same keys, with ages beside the date", async () => {
		const home = await projectionHome()
		const body = runBody(await projection(home, ["run", ...baseFlags(), "--monthly"]))
		expect(Object.keys(tableOf(body, "monthly").rows[0] ?? {}).sort()).toEqual([
			"accessibleNetWorth",
			"ages",
			"date",
			"netWorth",
			"realAccessibleNetWorth",
			"realNetWorth",
		])
	})

	it("is an empty list on every row without a household, so the shape is stable", async () => {
		const home = await projectionHome()
		const body = runBody(await projection(home, ["run", ...baseFlags(), "--monthly"]))
		expect(tableOf(body, "annual").rows.every((row) => row.ages.length === 0)).toBe(true)
		expect(tableOf(body, "monthly").rows.every((row) => row.ages.length === 0)).toBe(true)
	})

	it("counts a birthday on the row's date, and not the day before", async () => {
		const home = await withHousehold()
		const body = runBody(await projection(home, ["run", ...baseFlags(), "--monthly"]))
		const rows = tableOf(body, "monthly").rows
		// The holder turns 36 on 2026-06-30, a month end the monthly row lands on.
		expect(agesAt(rows, "2026-05-31")).toEqual([{ person: "me", age: 35 }])
		expect(agesAt(rows, "2026-06-30")).toEqual([
			{ person: "me", age: 36 },
			{ person: "child", age: 0 },
		])
	})

	it("states an annual row's ages on its last day, `to`", async () => {
		const home = await withHousehold()
		const body = runBody(await projection(home, ["run", ...baseFlags()]))
		const [row] = tableOf(body, "annual").rows
		expect(row?.to).toBe(HORIZON)
		expect(row?.ages).toEqual([
			{ person: "me", age: 36 },
			{ person: "partner", age: 35 },
			{ person: "child", age: 0 },
		])
	})

	it("gives an annual row ending on a birthday the new age, and the day before the old one", async () => {
		const home = await projectionHome()
		const march = {
			schemaVersion: 1,
			people: [{ id: "me", role: "holder", born: "1990-03", lifeExpectancy: 90 }],
			anchors: [],
		}
		expect((await setHousehold(home, march)).code).toBe(0)
		// The roll-up ends on 2027-03-31, the day the holder turns 37.
		const onBirthday = runBody(
			await projection(home, [
				"run",
				"--scenario",
				"base",
				"--as-of",
				"2026-04-01",
				"--horizon",
				"2027-03-31",
			]),
		)
		const [reached] = tableOf(onBirthday, "annual").rows
		expect(reached?.to).toBe("2027-03-31")
		expect(reached?.ages).toEqual([{ person: "me", age: 37 }])
		// A roll-up ending on 2027-03-30, the day before, states the age still held then.
		const dayBefore = runBody(await projection(home, ["run", ...baseFlags()]))
		const [before] = tableOf(dayBefore, "annual").rows
		expect(before?.to).toBe("2027-03-30")
		expect(before?.ages).toEqual([{ person: "me", age: 36 }])
	})

	it("includes a dependent born mid-plan from the row of their birth month, and not before", async () => {
		const home = await withHousehold()
		const body = runBody(await projection(home, ["run", ...baseFlags(), "--monthly"]))
		const rows = tableOf(body, "monthly").rows
		expect(agesAt(rows, "2026-05-31")).not.toContainEqual({ person: "child", age: 0 })
		expect(agesAt(rows, "2026-06-30")).toContainEqual({ person: "child", age: 0 })
	})

	it("includes a partner with joins from the row of that month, and not before", async () => {
		const home = await withHousehold()
		const body = runBody(await projection(home, ["run", ...baseFlags(), "--monthly"]))
		const rows = tableOf(body, "monthly").rows
		expect(agesAt(rows, "2026-08-31")).not.toContainEqual(
			expect.objectContaining({ person: "partner" }),
		)
		expect(agesAt(rows, "2026-09-30")).toContainEqual({ person: "partner", age: 34 })
	})

	it("reads a February birth's age on the last day of February in a non-leap year", async () => {
		const home = await withHousehold()
		const body = runBody(await projection(home, ["run", ...baseFlags(), "--monthly"]))
		const rows = tableOf(body, "monthly").rows
		expect(agesAt(rows, "2027-01-31")).toContainEqual({ person: "partner", age: 34 })
		expect(agesAt(rows, "2027-02-28")).toContainEqual({ person: "partner", age: 35 })
	})

	it("lists people in household order", async () => {
		const home = await withHousehold()
		const body = runBody(await projection(home, ["run", ...baseFlags(), "--monthly"]))
		const rows = tableOf(body, "monthly").rows
		expect(
			(agesAt(rows, "2026-09-30") as { person: string }[]).map((entry) => entry.person),
		).toEqual(["me", "partner", "child"])
	})

	it("shows the ages column in the human table, empty without a household", async () => {
		const home = await projectionHome()
		const bare = await capture(["projection", "run", ...baseFlags()], { TRAJ_HOME: home })
		expect(bare.code).toBe(0)
		expect(bare.out).toContain("  ages  ")
		const withPeople = await withHousehold()
		const human = await capture(["projection", "run", ...baseFlags()], { TRAJ_HOME: withPeople })
		expect(human.code).toBe(0)
		expect(human.out).toContain("me 36, partner 35, child 0")
	})
})

describe("ages at the FI date", () => {
	it("states the household's ages on a reachable FI date", async () => {
		const home = await withHousehold()
		const res = await fi(home, ["--scenario", "base", "--as-of", AS_OF, "--horizon", HORIZON])
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out) as {
			fi: { reachable: boolean; fiDate?: string; ages?: unknown }
		}
		expect(body.fi.reachable).toBe(true)
		// The FI date is 2026-04-01: the holder is still 35, and the partner and child have not joined.
		expect(body.fi.fiDate).toBe("2026-04-01")
		expect(body.fi.ages).toEqual([{ person: "me", age: 35 }])
	})

	it("states an empty list without a household", async () => {
		const home = await projectionHome()
		const res = await fi(home, ["--scenario", "base", "--as-of", AS_OF, "--horizon", HORIZON])
		const body = JSON.parse(res.out) as { fi: { reachable: boolean; ages?: unknown } }
		expect(body.fi.reachable).toBe(true)
		expect(body.fi.ages).toEqual([])
	})

	it("carries no ages on an unreachable FI answer", async () => {
		const home = await projectionHome()
		await scenario(home, ["household", "unreachable", "--file", "-"], JSON.stringify(HOUSEHOLD))
		const res = await fi(home, [
			"--scenario",
			"unreachable",
			"--as-of",
			AS_OF,
			"--horizon",
			HORIZON,
		])
		const body = JSON.parse(res.out) as { fi: { reachable: boolean; ages?: unknown } }
		expect(body.fi.reachable).toBe(false)
		expect(body.fi).not.toHaveProperty("ages")
	})
})

import { describe, expect, it } from "bun:test"
import {
	HOLDER,
	HOUSEHOLD,
	PARTNER,
	seedBase,
	setHousehold,
	shown,
} from "./scenario-household-support"
import { errorOf, resultOf, scenario, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

describe("scenario household", () => {
	it("writes each anchored date into the Scenario and keeps the household", async () => {
		const home = scenarioHome()
		const before = await seedBase(home)
		const res = await setHousehold(home, HOUSEHOLD)
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data.status).toBe("updated")
		expect(data.anchored).toEqual([
			{ path: "flows.salary.end", value: "2050-06-30" },
			{ path: "flows.bonus.end", value: "2052-02-29" },
		])
		expect(data.scenario.household).toEqual(HOUSEHOLD)
		expect(data.scenario.document.flows).toEqual([
			{ ...SCENARIO_DOCUMENT.flows[0], end: "2050-06-30" },
			{ ...SCENARIO_DOCUMENT.flows[1], end: "2052-02-29" },
		])
		expect(data.scenario.contentHash).not.toBe(before.contentHash)
		expect(await shown(home)).toMatchObject({ household: HOUSEHOLD })
	})

	it("moves an anchored date when a birth month is corrected, and an identical rewrite is unchanged", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const first = resultOf(await setHousehold(home, HOUSEHOLD)).scenario
		const corrected = { ...HOUSEHOLD, people: [{ ...HOLDER, born: "1990-07" }, PARTNER] }
		const moved = resultOf(await setHousehold(home, corrected))
		expect(moved.anchored[0]).toEqual({ path: "flows.salary.end", value: "2050-07-31" })
		expect(moved.scenario.contentHash).not.toBe(first.contentHash)
		const again = resultOf(await setHousehold(home, corrected))
		expect(again.status).toBe("unchanged")
	})

	it("removes the household with --none and keeps the dates it wrote", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const res = await scenario(home, ["household", "base", "--none"])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data).toMatchObject({ status: "updated", anchored: [] })
		expect(data.scenario.household).toBeNull()
		const row = await shown(home)
		expect(row.household).toBeNull()
		expect(row.document.flows).toMatchObject([{ id: "salary", end: "2050-06-30" }, { id: "bonus" }])
	})

	it("reports a --dry-run write and rolls it back", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const res = await setHousehold(home, HOUSEHOLD, ["--dry-run"])
		expect(resultOf(res)).toMatchObject({ dryRun: true, status: "updated" })
		expect((await shown(home)).household).toBeNull()
	})

	it("refuses a broken household at its document path and writes nothing", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const cases: [unknown, string][] = [
			[{ ...HOUSEHOLD, people: [PARTNER] }, "document.people"],
			[
				{ ...HOUSEHOLD, anchors: [{ ...HOUSEHOLD.anchors[0], person: "nobody" }] },
				"document.anchors.0.person",
			],
			[
				{ ...HOUSEHOLD, anchors: [{ path: "flows.salary.amount", person: "me", age: 60 }] },
				"document.anchors.0.path",
			],
			[
				{ ...HOUSEHOLD, anchors: [{ path: "flows.ghost.end", person: "me", age: 60 }] },
				"document.anchors.0.path",
			],
			[
				{ ...HOUSEHOLD, people: [{ ...HOLDER, lifeExpectancy: undefined }, PARTNER] },
				"document.people.0.lifeExpectancy",
			],
			[
				{ ...HOUSEHOLD, people: [{ ...HOLDER, born: "1990-13" }, PARTNER] },
				"document.people.0.born",
			],
			[
				{ ...HOUSEHOLD, anchors: [{ path: "flows.salary.end", person: "me", at: "joins" }] },
				"document.anchors.0.at",
			],
			[
				{ ...HOUSEHOLD, anchors: [HOUSEHOLD.anchors[0], HOUSEHOLD.anchors[0]] },
				"document.anchors.1.path",
			],
			[
				{ ...HOUSEHOLD, anchors: [{ path: "flows.salary.end", person: "me", age: -1 }] },
				"document.anchors.0.age",
			],
		]
		for (const [household, path] of cases) {
			const res = await setHousehold(home, household)
			expect({ path, code: res.code, error: errorOf(res).code }).toEqual({
				path,
				code: 2,
				error: "invalid_input",
			})
			expect(errorOf(res).path).toBe(path)
		}
		expect((await shown(home)).household).toBeNull()
	})

	it("names the YYYY-MM rule at a malformed birth month", async () => {
		const home = scenarioHome()
		await seedBase(home)
		for (const born of ["1990-13", "1990-6"]) {
			const res = await setHousehold(home, {
				...HOUSEHOLD,
				people: [{ ...HOLDER, born }, PARTNER],
			})
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({
				code: "invalid_input",
				path: "document.people.0.born",
			})
			expect(errorOf(res).hint).toContain("YYYY-MM")
		}
	})

	it("names the 0001-9998 rule at an anchored date outside it", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const res = await setHousehold(home, {
			...HOUSEHOLD,
			anchors: [{ ...HOUSEHOLD.anchors[0], age: 8100 }],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.anchors.0" })
		expect(errorOf(res).hint).toContain("0001")
		expect(errorOf(res).hint).toContain("9998")
	})

	it("names the join month rule at a joins anchor outside 0001-9998", async () => {
		const home = scenarioHome()
		await seedBase(home)
		for (const joins of ["9999-01", "0000-01"]) {
			const res = await setHousehold(home, {
				...HOUSEHOLD,
				people: [HOLDER, { ...PARTNER, joins }],
				anchors: [{ path: "flows.bonus.start", person: "partner", at: "joins" }],
			})
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.anchors.0" })
			expect(errorOf(res).hint).toContain("join month")
			expect(errorOf(res).hint).not.toContain("lifeExpectancy")
		}
	})

	it("names the birth year rule at a birth year below 0001", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const res = await setHousehold(home, {
			...HOUSEHOLD,
			people: [{ ...HOLDER, born: "0000-01" }, PARTNER],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.people.0.born",
		})
		expect(errorOf(res).hint).toContain("0001")
	})

	it("refuses an anchor that makes the Scenario's own check fail, at that anchor", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const ended = { ...HOUSEHOLD, anchors: [{ path: "flows.salary.end", person: "me", age: 10 }] }
		const res = await setHousehold(home, ended)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.anchors.0.path",
			details: { code: "END_BEFORE_START", anchored: "2000-06-30" },
		})
	})
})

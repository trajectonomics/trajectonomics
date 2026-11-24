import { describe, expect, it } from "bun:test"
import type { Household } from "./scenario/household/model"
import { HOLDER, seedBase, setHousehold, shown } from "./scenario-household-support"
import { applyScenario, resultOf, scenario, scenarioHome } from "./scenario-test-support"

/*
 * The employer rule of cli ADR-0048: an anchor on a Flow's date also moves every employer Contribution
 * whose `derive` reads that Flow's gross, with exactly the Flow's value, read from the document's
 * shape and not from an id.
 */

const SHARE = {
	measures: [
		{ id: "pay", op: "flow", flow: "salary" },
		{ id: "share", op: "scale", of: "pay", num: 5, den: 100, rounding: "floor" },
	],
	result: "share",
} as const

const SALARY = {
	id: "salary",
	kind: "income",
	earned: true,
	amount: 100_000,
	frequency: "monthly",
	growth: "inflation",
	start: "2026-01-01",
	end: "2040-01-01",
} as const

const contribution = (id: string, extra: Record<string, unknown>) => ({
	id,
	kind: "contribution",
	target: "pension",
	frequency: "monthly",
	start: "2026-01-01",
	end: "2040-01-01",
	derive: SHARE,
	...extra,
})

/** A salary, and `flows` after it, over a cash and a pension account. */
function plan(...flows: unknown[]) {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "pension", kind: "asset", rate: 0 },
		],
		flows: [SALARY, ...flows],
		cashflow: {
			surplus: [{ account: "cash" }],
			contribute: ["pension"],
			withdraw: ["cash"],
		},
	}
}

function retiresAt(age: number): Household {
	return {
		schemaVersion: 1,
		people: [HOLDER],
		anchors: [{ path: "flows.salary.end", person: "me", age }],
	}
}

type Flows = Record<string, unknown>[]

async function flowsAfter(home: string): Promise<Flows> {
	return (await shown(home)).document.flows
}

describe("scenario household and an employer's share", () => {
	it("moves the employer Flow's end with the salary's when retirement moves", async () => {
		const home = scenarioHome()
		await seedBase(home, plan(contribution("salary-employer", { funding: "employer" })))
		await setHousehold(home, retiresAt(60))
		expect((await flowsAfter(home)).map((flow) => flow["end"])).toEqual([
			"2050-06-30",
			"2050-06-30",
		])
		const moved = resultOf(await setHousehold(home, retiresAt(62)))
		expect(moved.anchored).toEqual([{ path: "flows.salary.end", value: "2052-06-30" }])
		expect((await flowsAfter(home)).map((flow) => flow["end"])).toEqual([
			"2052-06-30",
			"2052-06-30",
		])
	})

	it("follows a Flow by what its derive reads, not by its id", async () => {
		const home = scenarioHome()
		await seedBase(home, plan(contribution("pension-match", { funding: "employer" })))
		await setHousehold(home, retiresAt(60))
		expect((await flowsAfter(home))[1]).toMatchObject({ id: "pension-match", end: "2050-06-30" })
	})

	it("leaves a salary without an employer share unchanged, byte for byte", async () => {
		const home = scenarioHome()
		await seedBase(home, plan())
		await setHousehold(home, retiresAt(60))
		expect((await flowsAfter(home))[0]).toEqual({ ...SALARY, end: "2050-06-30" })
		expect(await flowsAfter(home)).toHaveLength(1)
	})

	it("does not move an employer Contribution that reads a different Flow", async () => {
		const home = scenarioHome()
		const bonus = { ...SALARY, id: "bonus", amount: 5_000 }
		const other = contribution("bonus-employer", {
			funding: "employer",
			derive: {
				...SHARE,
				measures: [{ id: "pay", op: "flow", flow: "bonus" }, SHARE.measures[1]],
			},
		})
		await seedBase(home, plan(bonus, other))
		await setHousehold(home, retiresAt(60))
		expect(await flowsAfter(home)).toEqual([{ ...SALARY, end: "2050-06-30" }, bonus, other])
	})

	it("does not move a Contribution whose funding is not employer, though it reads the salary", async () => {
		const home = scenarioHome()
		const own = contribution("own-share", { funding: "target" })
		const unstated = contribution("unstated-share", {})
		await seedBase(home, plan(own, unstated))
		await setHousehold(home, retiresAt(60))
		expect(await flowsAfter(home)).toEqual([{ ...SALARY, end: "2050-06-30" }, own, unstated])
	})

	it("moves a start the same way, and leaves a date the household pins on the employer Flow itself", async () => {
		const home = scenarioHome()
		await seedBase(home, plan(contribution("salary-employer", { funding: "employer" })))
		const household: Household = {
			schemaVersion: 1,
			people: [HOLDER],
			anchors: [
				{ path: "flows.salary.start", person: "me", age: 40 },
				{ path: "flows.salary.end", person: "me", age: 60 },
				{ path: "flows.salary-employer.end", person: "me", age: 58 },
			],
		}
		const res = await setHousehold(home, household)
		expect(res.code).toBe(0)
		expect(await flowsAfter(home)).toMatchObject([
			{ id: "salary", start: "2030-06-30", end: "2050-06-30" },
			{ id: "salary-employer", start: "2030-06-30", end: "2048-06-30" },
		])
	})

	it("fills an employer Flow's missing date when an apply leaves the salary's out, and keeps a stated one", async () => {
		const home = scenarioHome()
		await seedBase(home, plan(contribution("salary-employer", { funding: "employer" })))
		await setHousehold(home, retiresAt(60))
		const bare = { ...SALARY, end: undefined }
		const open = contribution("salary-employer", { funding: "employer", end: undefined })
		const filled = resultOf(
			await applyScenario(home, "base", { ...plan(open), flows: [bare, open] }),
		)
		expect(filled.status).toBe("unchanged")
		expect((await flowsAfter(home)).map((flow) => flow["end"])).toEqual([
			"2050-06-30",
			"2050-06-30",
		])
		const stated = contribution("salary-employer", { funding: "employer", end: "2045-01-01" })
		await applyScenario(home, "base", { ...plan(stated), flows: [bare, stated] })
		expect((await flowsAfter(home)).map((flow) => flow["end"])).toEqual([
			"2050-06-30",
			"2045-01-01",
		])
		expect((await scenario(home, ["show", "base"])).code).toBe(0)
	})
})

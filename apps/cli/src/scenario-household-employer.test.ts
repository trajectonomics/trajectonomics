import { describe, expect, it } from "bun:test"
import type { Household } from "./scenario/household/model"
import {
	contribution,
	flowsAfter,
	plan,
	retiresAt,
	SALARY,
	SHARE,
} from "./scenario-household-employer-support"
import { HOLDER, seedBase, setHousehold } from "./scenario-household-support"
import { applyScenario, resultOf, scenario, scenarioHome } from "./scenario-test-support"

/*
 * The employer rule of cli ADR-0048: an anchor on a Flow's date also moves every employer Contribution
 * whose `derive` reads that Flow's gross, with exactly the Flow's value, read from the document's
 * shape and not from an id.
 */

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
		expect(moved.followed).toEqual([
			{
				path: "flows.salary-employer.end",
				value: "2052-06-30",
				follows: "flows.salary.end",
			},
		])
		expect((await flowsAfter(home)).map((flow) => flow["end"])).toEqual([
			"2052-06-30",
			"2052-06-30",
		])
	})

	it("states the dates it wrote for the share under --dry-run, and leaves the plan as it was", async () => {
		const home = scenarioHome()
		await seedBase(home, plan(contribution("salary-employer", { funding: "employer" })))
		const res = resultOf(await setHousehold(home, retiresAt(60), ["--dry-run"]))
		expect(res).toMatchObject({
			dryRun: true,
			anchored: [{ path: "flows.salary.end", value: "2050-06-30" }],
			followed: [
				{ path: "flows.salary-employer.end", value: "2050-06-30", follows: "flows.salary.end" },
			],
		})
		expect((await flowsAfter(home)).map((flow) => flow["end"])).toEqual([
			"2040-01-01",
			"2040-01-01",
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
		const bare = resultOf(await setHousehold(home, retiresAt(62)))
		expect("followed" in bare).toBe(false)
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

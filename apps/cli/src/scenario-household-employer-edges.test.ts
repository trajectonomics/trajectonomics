import { describe, expect, it } from "bun:test"
import { contribution, flowsAfter, plan, retiresAt } from "./scenario-household-employer-support"
import { seedBase, setHousehold } from "./scenario-household-support"
import { errorOf, resultOf, scenarioHome } from "./scenario-test-support"

/* The edges of the employer rule of cli ADR-0048: many shares, a drifted share, a refused move. */

describe("scenario household and an employer's share, at its edges", () => {
	it("moves every share that reads the salary, not only the first", async () => {
		const home = scenarioHome()
		await seedBase(
			home,
			plan(
				contribution("match-a", { funding: "employer" }),
				contribution("match-b", { funding: "employer" }),
			),
		)
		const res = resultOf(await setHousehold(home, retiresAt(60)))
		expect((await flowsAfter(home)).map((flow) => flow["end"])).toEqual([
			"2050-06-30",
			"2050-06-30",
			"2050-06-30",
		])
		expect(res.followed.map((one: { path: string }) => one.path)).toEqual([
			"flows.match-a.end",
			"flows.match-b.end",
		])
	})

	it("overwrites a share whose end had drifted from the salary's", async () => {
		const home = scenarioHome()
		await seedBase(
			home,
			plan(contribution("salary-employer", { funding: "employer", end: "2035-01-01" })),
		)
		await setHousehold(home, retiresAt(60))
		expect((await flowsAfter(home))[1]).toMatchObject({ end: "2050-06-30" })
	})

	it("names the share when moving it is what the Scenario refuses", async () => {
		const home = scenarioHome()
		const late = contribution("salary-employer", {
			funding: "employer",
			start: "2045-01-01",
			end: "2046-01-01",
		})
		await seedBase(home, plan(late))
		// Retirement at 50 ends the salary on 2040-06-30, and the share would end before it starts.
		const res = await setHousehold(home, retiresAt(50))
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error.path).toBe("document.anchors.0.path")
		expect(error.details).toMatchObject({
			code: expect.any(String),
			followed: "flows.salary-employer.end",
		})
		expect(error.message).toContain(
			"(it also moves flows.salary-employer.end, the employer's share, per cli ADR-0048)",
		)
	})
})

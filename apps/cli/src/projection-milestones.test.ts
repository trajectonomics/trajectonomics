import { describe, expect, it } from "bun:test"
import { drainedScenario, HORIZON, projection, projectionHome } from "./projection/testing"
import { humanRun, MILESTONES, withMilestones } from "./projection-milestones-support"
import { runBody, tableOf } from "./projection-run-support"
import { applyScenario } from "./scenario-test-support"

/*
 * A Scenario's milestones and what a Projection reports of them (cli ADR-0049): the rows of the
 * `milestones` table in `projection run`, the same rows on each side of `projection compare`, and
 * the human sentence for a milestone that did not fire.
 */

describe("projection run reports each milestone's date", () => {
	it("states a reached milestone's date and an unreached one as null, in Scenario order", async () => {
		const home = await withMilestones()
		const res = await projection(home, [
			"run",
			"--scenario",
			"milestoned",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(0)
		const table = tableOf(runBody(res), "milestones")
		expect(table.count).toBe(2)
		expect(table.rows).toEqual([
			{ id: "reached", reached: true, date: "2026-06-30" },
			{ id: "never", reached: false, date: null },
		])
	})

	it("has no milestones table for a Scenario that declares none", async () => {
		const home = await withMilestones()
		const res = await projection(home, [
			"run",
			"--scenario",
			"base",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(0)
		expect(runBody(res).tables.map((table) => table.name)).toEqual(["annual"])
	})

	it("prints the milestones table, saying an unreached milestone is not reached by the horizon", async () => {
		const home = await withMilestones()
		const res = await humanRun(home, [
			"run",
			"--scenario",
			"milestoned",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(0)
		expect(res.out).toContain("milestones (2 rows)")
		expect(res.out).toContain("reached  true")
		expect(res.out).toContain(`not reached by ${HORIZON}`)
		expect(res.out).not.toContain("null")
	})

	it("says the run-out month when the plan runs out before the horizon", async () => {
		const home = await projectionHome()
		// The plan runs out inside the horizon, so the sentence names the run-out month, not the horizon.
		const drained = { ...drainedScenario("2026-12-31"), milestones: MILESTONES }
		const applied = await applyScenario(home, "drained-milestoned", drained)
		expect(applied.code).toBe(0)
		const res = await humanRun(home, [
			"run",
			"--scenario",
			"drained-milestoned",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(0)
		expect(res.out).toContain("not reached by 2026-12-31")
		expect(res.out).not.toContain(`not reached by ${HORIZON}`)
	})

	it("moves a reached date when --set changes the criterion it fires on", async () => {
		const home = await withMilestones()
		const res = await projection(home, [
			"run",
			"--scenario",
			"milestoned",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
			"--set",
			'milestones.reached.criteria.start.on="2026-08-01"',
		])
		expect(res.code).toBe(0)
		expect(tableOf(runBody(res), "milestones").rows[0]).toEqual({
			id: "reached",
			reached: true,
			date: "2026-08-01",
		})
	})
})

describe("projection compare reports each side's milestones", () => {
	it("pins the rows under the side that declares them, and none under the other", async () => {
		const home = await withMilestones()
		const res = await projection(home, [
			"compare",
			"milestoned",
			"base",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out) as {
			sides: { a: { milestones?: unknown[] }; b: { milestones?: unknown[] } }
		}
		expect(body.sides.a.milestones).toEqual([
			{ id: "reached", reached: true, date: "2026-06-30" },
			{ id: "never", reached: false, date: null },
		])
		expect(body.sides.b).not.toHaveProperty("milestones")
	})

	it("prints each side's milestones as a table in the human Format", async () => {
		const home = await withMilestones()
		const res = await humanRun(home, [
			"compare",
			"milestoned",
			"base",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(0)
		expect(res.out).toContain("milestones of A (2 rows)")
		expect(res.out).toContain(`not reached by ${HORIZON}`)
		expect(res.out).not.toContain("milestones of B")
	})
})

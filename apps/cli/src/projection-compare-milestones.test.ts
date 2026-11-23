import { describe, expect, it } from "bun:test"
import { AS_OF, dateFlags, HORIZON, projection, projectionHome } from "./projection/testing"
import { bodyOf } from "./projection-compare-support"
import { withMilestones } from "./projection-milestones-support"

/*
 * The change for each Milestone declared on both sides of a compare (cli ADR-0049, amended). `months`
 * is whole calendar months from side A's date to side B's, and null when either side did not reach it.
 */

describe("projection compare reports the change for each Milestone", () => {
	it("gives each Milestone declared on both sides its two dates and whole months between them", async () => {
		const home = await withMilestones()
		// The reached Milestone moves from 2026-06-30 to 2026-08-01 on the what-if: 32 days later.
		// Whole calendar months: (2026 - 2026) * 12 + (8 - 6) = 2. The never-reached one stays unreached
		// on both sides, so it has no months.
		const body = bodyOf(
			await projection(home, [
				"compare",
				"milestoned",
				"--as-of",
				AS_OF,
				"--horizon",
				HORIZON,
				"--set",
				'milestones.reached.criteria.start.on="2026-08-01"',
			]),
		)
		expect(body.deltas.milestones).toEqual([
			{ id: "reached", a: "2026-06-30", b: "2026-08-01", months: 2 },
			{ id: "never", a: null, b: null, months: null },
		])
	})

	it("has no months for a Milestone one side did not reach", async () => {
		const home = await withMilestones()
		// The what-if's Milestone is dated after the horizon, so side B does not reach it.
		const body = bodyOf(
			await projection(home, [
				"compare",
				"milestoned",
				"--as-of",
				AS_OF,
				"--horizon",
				HORIZON,
				"--set",
				'milestones.reached.criteria.start.on="2027-06-30"',
			]),
		)
		expect(body.deltas.milestones?.[0]).toEqual({
			id: "reached",
			a: "2026-06-30",
			b: null,
			months: null,
		})
	})

	it("lists no Milestone that only one side declares, but keeps the key", async () => {
		const home = await withMilestones()
		const body = bodyOf(
			await projection(home, [
				"compare",
				"milestoned",
				"base",
				"--as-of",
				AS_OF,
				"--horizon",
				HORIZON,
			]),
		)
		// Side B has no Milestones, so no id is on both sides: the list is empty, not absent.
		expect(body.deltas.milestones).toEqual([])
		expect(body.sides.a.milestones).toHaveLength(2)
	})

	it("has no milestones key when neither side declares Milestones", async () => {
		const home = await projectionHome()
		const body = bodyOf(await projection(home, ["compare", "base", "unreachable", ...dateFlags()]))
		expect(body.deltas).not.toHaveProperty("milestones")
	})
})

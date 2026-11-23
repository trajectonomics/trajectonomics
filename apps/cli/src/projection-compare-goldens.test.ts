import { describe, it } from "bun:test"
import { AS_OF, dateFlags, HORIZON, projection, projectionHome } from "./projection/testing"
import { expectGolden } from "./projection-compare-support"
import { withMilestones } from "./projection-milestones-support"

/*
 * The compare's bytes, pinned (cli ADR-0049, amended). A golden is recorded deliberately with
 * TRAJ_UPDATE_GOLDEN=1 and the engine version it was produced with is checked first. The compare
 * without Milestones gained only the `tables` key; its bytes differ from before by that key alone.
 */

describe("projection compare's new fields are pinned by goldens", () => {
	it("pins a compare without milestones, byte for byte", async () => {
		const home = await projectionHome()
		await expectGolden(
			"compare-no-milestones.output",
			await projection(home, ["compare", "base", "unreachable", ...dateFlags()]),
		)
	})

	it("pins a what-if whose income change moves every year's income delta", async () => {
		const home = await projectionHome()
		await expectGolden(
			"compare-what-if.output",
			await projection(home, [
				"compare",
				"base",
				"--set",
				"flows.salary.amount=9000000",
				...dateFlags(),
			]),
		)
	})

	it("pins a side that runs out part-way through the horizon", async () => {
		const home = await projectionHome()
		await expectGolden(
			"compare-run-out.output",
			await projection(home, [
				"compare",
				"drained-2029",
				"base",
				"--as-of",
				AS_OF,
				"--horizon",
				"2030-03-30",
			]),
		)
	})

	it("pins a Levy on one side only", async () => {
		const home = await projectionHome()
		await expectGolden(
			"compare-levy.output",
			await projection(home, ["compare", "base", "levied", ...dateFlags()]),
		)
	})

	it("pins a Milestone reached on both sides, moved by a what-if", async () => {
		const home = await withMilestones()
		await expectGolden(
			"compare-milestones.output",
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
	})
})

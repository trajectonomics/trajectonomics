import { describe, expect, it } from "bun:test"
import { projectionCompare } from "./projection-compare"

/*
 * The CLI's own `projection compare` golden, parsed by the Dashboard's contract (cli ADR-0049, amended
 * in 0.8.0). Side a declares the milestone and side b reaches it later, so both the per-side rows and
 * the delta are pinned against the CLI's bytes.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/projection/fixtures/", import.meta.url)

async function golden(name: string): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL(name, CLI_FIXTURES)).text())
}

describe("the projection compare contract against the CLI's milestones golden", () => {
	it("parses each side's milestones, reached and not reached", async () => {
		const compare = projectionCompare.parse(await golden("compare-milestones.output"))
		expect(compare.sides.a.milestones).toEqual([
			{ id: "reached", reached: true, date: "2026-06-30" },
			{ id: "never", reached: false, date: null },
		])
		expect(compare.sides.b.milestones).toEqual([
			{ id: "reached", reached: true, date: "2026-08-01" },
			{ id: "never", reached: false, date: null },
		])
	})

	it("parses the delta of a milestone both sides declare, in whole months, and null where one side missed it", async () => {
		const compare = projectionCompare.parse(await golden("compare-milestones.output"))
		expect(compare.deltas.milestones).toEqual([
			{ id: "reached", a: "2026-06-30", b: "2026-08-01", months: 2 },
			{ id: "never", a: null, b: null, months: null },
		])
	})
})

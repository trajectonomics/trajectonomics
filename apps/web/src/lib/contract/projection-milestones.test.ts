import { describe, expect, it } from "bun:test"
import { projectionRun } from "./projection-run"

/*
 * The milestones table of the CLI's `projection run` goldens, parsed by the Dashboard's contract (cli
 * ADR-0049): a milestone that fired carries its date, one the plan did not reach carries null.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/projection/fixtures/", import.meta.url)

async function golden(name: string): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL(name, CLI_FIXTURES)).text())
}

describe("the projection run milestones against the CLI's goldens", () => {
	it("parses a milestone that fired, with its date (cli ADR-0049)", async () => {
		const run = projectionRun.parse(await golden("run-spending.output"))
		const milestones = run.tables.find((table) => table.name === "milestones")
		if (milestones?.name !== "milestones") throw new Error("the output has no milestones table")
		expect(milestones.rows).toEqual([{ id: "retire", reached: true, date: "2045-01-01" }])
	})

	it("parses a milestone the plan did not reach, with a null date (cli ADR-0049)", async () => {
		const run = projectionRun.parse(await golden("run-accounts.output"))
		const milestones = run.tables.find((table) => table.name === "milestones")
		if (milestones?.name !== "milestones") throw new Error("the output has no milestones table")
		expect(milestones.rows).toEqual([{ id: "retire", reached: false, date: null }])
	})
})

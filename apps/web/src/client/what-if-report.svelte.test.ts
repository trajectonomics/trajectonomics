import { describe, expect, test } from "bun:test"
import type { ProjectionRun, Read } from "../lib/contract"
import { projectionRunFixture } from "../lib/view/projection/fixtures.test-support"
import { everythingFile } from "../lib/view/reports/files"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH, useSessionHooks } from "./what-if.test-support"

useSessionHooks()

const RENT = {
	id: "rent",
	kind: "expense",
	frequency: "monthly",
	start: "2026-11-01",
	amount: "5000.00",
}

function readOf(run: ProjectionRun): Read<ProjectionRun> {
	return { argv: ["projection", "run"], ok: true, data: run }
}

describe("a report names the changes the session sends", () => {
	test("a held try is not in the everything file, because it did not produce the figures", () => {
		whatIfSession.tryFlow("base", HASH, { stored: RENT, edited: { ...RENT, amount: "6000.00" } })
		whatIfSession.setOff("base", HASH, "flows.rent", true)
		// The session holds the try, held back by the switch: `traj` refuses a Set of a Flow a Removal took out.
		expect(whatIfSession.changesFor("base")?.sets).toEqual([
			{ path: "flows.rent.amount", value: "6000.00" },
		])
		expect(whatIfSession.sentChangesFor("base")).toEqual({ sets: [], removals: ["flows.rent"] })
		const run = projectionRunFixture()
		const file = everythingFile(
			{ projections: { base: readOf(run) }, fi: {}, documents: {}, chance: {} },
			{ plan: "base", asOf: "2026-10-31", whatIf: true, run },
			whatIfSession.sentChangesFor("base"),
		)
		expect(JSON.parse(file.text).whatIf).toEqual({
			plan: "base",
			sets: [],
			removals: ["flows.rent"],
			projection: run,
		})
	})
})

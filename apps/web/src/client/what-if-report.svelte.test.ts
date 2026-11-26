import { describe, expect, test } from "bun:test"
import type { ProjectionRun, Read } from "../lib/contract"
import { projectionRunFixture } from "../lib/view/projection/fixtures.test-support"
import { everythingFile } from "../lib/view/reports/files"
import type { Addition } from "../lib/what-if/additions"
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

const SALARY = {
	kind: "salary" as const,
	name: "salary",
	paths: ["flows.salary", "flows.salary-employer"],
}

const SHARE: Addition = {
	list: "flows",
	item: {
		id: "salary-employer",
		kind: "contribution",
		target: "fund",
		funding: "employer",
		frequency: "monthly",
		start: "2026-11-01",
	},
}

const RMF: Addition = {
	list: "flows",
	item: {
		id: "rmf",
		kind: "contribution",
		frequency: "once",
		start: "2026-12-15",
		amount: "1000.00",
		target: "fund",
	},
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
		expect(whatIfSession.sentChangesFor("base")).toEqual({
			sets: [],
			removals: ["flows.rent"],
			additions: [],
		})
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
			additions: [],
			projection: run,
		})
	})

	test("a sent Addition is in the everything file, and a held one is not", () => {
		whatIfSession.addItems("base", HASH, [SHARE, RMF])
		// The salary's switch holds the added share in the session, where a Removal covers it, so `traj` never sees it.
		whatIfSession.setGroupOff("base", HASH, SALARY, SALARY.paths, true)
		expect(whatIfSession.sentChangesFor("base")).toEqual({
			sets: [],
			removals: ["flows.salary"],
			additions: [RMF],
		})
		const run = projectionRunFixture()
		const file = everythingFile(
			{ projections: { base: readOf(run) }, fi: {}, documents: {}, chance: {} },
			{ plan: "base", asOf: "2026-10-31", whatIf: true, run },
			whatIfSession.sentChangesFor("base"),
		)
		expect(JSON.parse(file.text).whatIf).toEqual({
			plan: "base",
			sets: [],
			removals: ["flows.salary"],
			additions: [RMF],
			projection: run,
		})
	})
})

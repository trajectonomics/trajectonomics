// Every future on the Chance page and one future year by year, against the real traj (web ADR 0020): the Snapshot reads the
// five representative paths, the earliest run-out opens with its fall year and run-out marker, and a path the Snapshot did
// not read is read live through POST /reread, leaving the Snapshot alone.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pathReads } from "../src/client/path-reads.svelte"
import type { Snapshot } from "../src/lib/contract"
import { pathAnswer, pathKey, sameRun } from "../src/lib/snapshot/paths"
import { runKey } from "../src/lib/view/chance/path-state"
import { demoCarryIn } from "./demo/carry-in"
import { DEMO_PATHS } from "./demo/return-model"
import { SLOW_MS } from "./edit-fixture.test-support"
import {
	chanceOf,
	disposeFutures,
	editorOf,
	PLAN,
	page,
	paramsOf,
	readPath,
	setupFutures,
	snapshotOf,
	trajOf,
} from "./futures.test-support"
import { answerPath } from "./serve-path"

beforeAll(setupFutures, SLOW_MS)
afterAll(disposeFutures)

describe("the Snapshot's futures", () => {
	test("the chance read lists every path, and names the five picks", () => {
		const chance = chanceOf()
		expect(chance.outcomes).toHaveLength(DEMO_PATHS)
		expect(chance.outcomes?.map((outcome) => outcome.index)).toEqual(
			Array.from({ length: DEMO_PATHS }, (_, i) => i),
		)
		const picks = chance.representative
		expect(picks?.earliestRunsOut).not.toBeNull()
	})

	test("reads each representative path in advance, each of the chance's own run, and no other", () => {
		const chance = chanceOf()
		const { p10, p50, p90, earliestRunsOut, lowest } = chance.representative ?? {}
		const wanted = [...new Set([p10, p50, p90, earliestRunsOut, lowest])]
			.map((index) => pathKey(index as number))
			.sort()
		const stored = snapshotOf().reads.paths[PLAN] ?? {}
		expect(Object.keys(stored).sort()).toEqual(wanted)
		for (const read of Object.values(stored)) {
			expect(read.ok && sameRun(chance, read.data)).toBe(true)
		}
	})

	test("a path's closing net worth and run-out are the chance's own outcome for that index", () => {
		const chance = chanceOf()
		for (const [key, read] of Object.entries(snapshotOf().reads.paths[PLAN] ?? {})) {
			if (!read.ok) throw new Error(read.error.message)
			const outcome = chance.outcomes?.[Number(key)]
			const annual = read.data.tables.find((table) => table.name === "annual")
			const last = annual?.name === "annual" ? annual.rows.at(-1) : undefined
			expect(read.data.index).toBe(Number(key))
			expect(last?.closingNetWorth).toBe(outcome?.closingNetWorth)
			expect(read.data.runsOut).toEqual(outcome?.runsOut ?? null)
		}
	})
})

describe("opening the earliest run-out from the Chance page", () => {
	test("shows the year of the fall and the run-out marker, with no live read", () => {
		const chance = chanceOf()
		const index = chance.representative?.earliestRunsOut as number
		const outcome = chance.outcomes?.[index]
		const body = page(index)
		expect(body).toContain(`Future ${index} of ${DEMO_PATHS}`)
		const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(
			new Date(`${outcome?.runsOut?.date}T00:00:00Z`),
		)
		expect(body).toContain(`Ran out in ${month} ${outcome?.runsOut?.date.slice(0, 4)}`)
		expect(body).toContain("Lowest point")
		expect(body).toContain("in the year from")
		expect(body).toContain("Ran out: ")
		expect(body).toContain("Fund return")
	})
})

describe("a path the Snapshot did not read, through POST /reread", () => {
	const chance = () => chanceOf()
	const other = () => {
		const held = new Set(Object.keys(snapshotOf().reads.paths[PLAN] ?? {}))
		const index = chance().outcomes?.find(
			(o) => !held.has(pathKey(o.index)) && o.runsOut !== null,
		)?.index
		if (index === undefined) throw new Error("every path is a representative one")
		return index
	}

	test(
		"reads that one path, of the chance's own run, and leaves the served Snapshot as it was",
		async () => {
			const before = editorOf().body
			const index = other()
			const { status, answer } = await readPath({ path: { plan: PLAN, index } })
			expect(status).toBe(200)
			if (!answer.ok || !answer.path.ok) throw new Error("the path was not read")
			expect(answer.path.argv.slice(0, 2)).toEqual(["projection", "path"])
			expect(answer.path.argv).toContain(`--index=${index}`)
			expect(answer.path.data.index).toBe(index)
			expect(sameRun(chance(), answer.path.data)).toBe(true)
			expect(editorOf().body).toBe(before)
			// The page shows it once this tab holds it for the run on screen.
			pathReads.entries = {
				[JSON.stringify([PLAN, index])]: {
					run: runKey(chance()),
					status: "done",
					read: answer.path,
				},
			}
			expect(page(index)).toContain(`Future ${index} of ${DEMO_PATHS}`)
			pathReads.entries = {}
		},
		SLOW_MS,
	)

	test("is refused for an index outside the paths, an unknown plan, and a body with another field", async () => {
		const outside = await readPath({ path: { plan: PLAN, index: DEMO_PATHS } })
		expect(outside.status).toBe(400)
		expect(outside.answer).toMatchObject({ ok: false, error: { code: "invalid_path_index" } })
		const unknown = await readPath({ path: { plan: "nope", index: 1 } })
		expect(unknown.answer).toMatchObject({ ok: false, error: { code: "unknown_plan" } })
		for (const body of [
			{ path: { plan: PLAN, index: 1 }, allowances: null },
			{ path: { plan: "--help", index: 1 } },
			{ path: { plan: PLAN, index: 1.5 } },
			{ path: { plan: PLAN, index: 1, argv: ["x"] } },
		]) {
			const refused = await readPath(body)
			expect(refused.status).toBe(400)
			expect(refused.answer).toMatchObject({ ok: false, error: { code: "invalid_reread" } })
		}
	})

	test(
		"answers an error, never a path, when the chance the Snapshot holds is of another run than the replay",
		async () => {
			const held = structuredClone(snapshotOf()) as Snapshot
			const read = held.reads.chance[PLAN]
			if (read?.ok !== true) throw new Error("the chance read failed")
			read.data.scenario.effectiveContentHash = "jcs1:sha256:changed-since"
			const response = await answerPath(
				{ plan: PLAN, index: 1 },
				paramsOf(),
				held,
				trajOf(),
				demoCarryIn([PLAN]),
			)
			expect(pathAnswer.parse(await response.json())).toMatchObject({
				ok: false,
				error: { code: "path_of_another_run" },
			})
		},
		SLOW_MS,
	)

	test("keeps every guard of a reread: the token, the Origin, the Host and the content type", async () => {
		const body = { path: { plan: PLAN, index: 1 } }
		expect((await readPath(body, { "x-traj-edit-token": "wrong" })).status).toBe(403)
		expect((await readPath(body, { origin: "http://evil.example" })).status).toBe(403)
		expect((await readPath(body, { host: "evil.example" })).status).toBe(403)
		expect((await readPath(body, { "content-type": "text/plain" })).status).toBe(415)
	})
})

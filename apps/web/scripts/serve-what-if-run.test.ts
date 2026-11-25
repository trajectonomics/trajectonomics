// POST /what-if against the real traj: one at a time, each read carries its Overrides and nothing is written, and
// the Edits that keep a what-if are checked against the ledger.
import { afterAll, afterEach, describe, expect, test } from "bun:test"
import {
	BINARY,
	disposeEditor,
	hashOf,
	ledgerHome,
	ledgerShow,
	postEdit,
	SLOW_MS,
	setupEditor,
} from "./edit-fixture.test-support"
import { editRequest, PORT } from "./edit-request.test-support"
import { settle } from "./editor-running.test-support"

/** A what-if that switches off `car`, the demo ledger's Flow that nothing else reads. */
const GOOD = JSON.stringify({ plan: "base", sets: [], removals: ["flows.car"] })

async function refused(response: Response): Promise<{ status: number; code: string }> {
	const body = (await response.json()) as { ok: false; error: { code: string } }
	expect(body.ok).toBe(false)
	return { status: response.status, code: body.error.code }
}

describe("POST /what-if one at a time", () => {
	test(
		"a second what-if while one runs is refused with 409, and an Edit while one runs too",
		async () => {
			const editor = await setupEditor()
			const first = editor.whatIf(editRequest({}, GOOD), PORT)
			const second = await editor.whatIf(editRequest({}, GOOD), PORT)
			expect(await refused(second)).toEqual({ status: 409, code: "edit_running" })
			const edit = await editor.edit(
				editRequest({}, JSON.stringify({ kind: "delete-plan", name: "nope" })),
				PORT,
			)
			expect(await refused(edit)).toEqual({ status: 409, code: "edit_running" })
			expect((await first).status).toBe(200)
		},
		SLOW_MS,
	)
})

describe("POST /what-if against the real traj", () => {
	test(
		"a removal answers each read with its Override in the argv and its echo, and writes nothing",
		async () => {
			const before = ledgerShow("base", true)
			const editor = await setupEditor()
			const response = await editor.whatIf(editRequest({}, GOOD), PORT)
			expect(response.status).toBe(200)
			const body = (await response.json()) as {
				ok: true
				reads: {
					projection: { ok: boolean; argv: string[]; data?: { removals: string[] } }
					fi: { ok: boolean; argv: string[] }
					compare: { ok: boolean }
					chance: null
				}
			}
			expect(body.reads.projection.ok).toBe(true)
			expect(body.reads.projection.argv).toContain("--without=flows.car")
			expect(body.reads.projection.data?.removals).toEqual(["flows.car"])
			expect(body.reads.fi.ok).toBe(true)
			expect(body.reads.fi.argv).toContain("--without=flows.car")
			expect(body.reads.compare.ok).toBe(true)
			expect(body.reads.chance).toBeNull()
			expect(ledgerShow("base", true)).toEqual(before)
		},
		SLOW_MS,
	)

	test(
		"a Set the CLI refuses is answered as an error at its own read, and the answer is still ok",
		async () => {
			const editor = await setupEditor()
			const body = JSON.stringify({
				plan: "base",
				sets: [{ path: "flows.nope.amount", value: "1.00" }],
				removals: [],
			})
			const response = await editor.whatIf(editRequest({}, body), PORT)
			const answer = (await response.json()) as {
				ok: true
				reads: { projection: { ok: boolean; error?: { code: string } } }
			}
			expect(answer.ok).toBe(true)
			expect(answer.reads.projection.ok).toBe(false)
			expect(answer.reads.projection.error?.code).toBeTruthy()
		},
		SLOW_MS,
	)
})

describe("keeping a what-if: copy and apply, each through the Edit guards and the dry run", () => {
	test(
		"copy-plan with Overrides saves a plan that holds them",
		async () => {
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "copy-plan",
					from: "base",
					name: "what-if-copy",
					sets: [{ path: "flows.salary.amount", value: "9000.50" }],
					removals: ["flows.car"],
				}),
			)
			expect(status).toBe(200)
			expect(answer.ok).toBe(true)
			const copy = ledgerShow("what-if-copy", true)
			expect(copy.scenario.document.flows.map((flow) => flow.id)).not.toContain("car")
			expect(copy.scenario.document.flows.find((flow) => flow.id === "salary")?.amount).toBe(
				"9000.50",
			)
		},
		SLOW_MS,
	)

	test(
		"apply-overrides over a plan that changed since the page read it is refused, and nothing is written",
		async () => {
			await setupEditor()
			// A change made in a terminal moves the stored plan on; the page's hash is the one it read before.
			const stale = hashOf("base")
			const terminal = Bun.spawnSync([BINARY, "scenario", "tax", "base", "--none", "--json"], {
				env: { ...process.env, TRAJ_HOME: ledgerHome() },
			})
			expect(terminal.exitCode).toBe(0)
			const before = ledgerShow("base", true)
			expect(before.scenario.contentHash).not.toBe(stale)
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "apply-overrides",
					name: "base",
					contentHash: stale,
					sets: [{ path: "flows.salary.amount", value: "9000.50" }],
					removals: [],
				}),
			)
			expect(status).toBe(200)
			expect(answer.ok).toBe(false)
			if (!answer.ok) expect(answer.error.code).toBe("scenario_changed")
			expect(ledgerShow("base", true)).toEqual(before)
		},
		SLOW_MS,
	)

	test(
		"apply-overrides with the hash the page read now saves the what-if to the plan",
		async () => {
			await setupEditor()
			const hash = hashOf("base")
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "apply-overrides",
					name: "base",
					contentHash: hash,
					sets: [{ path: "flows.salary.amount", value: "9000.50" }],
					removals: [],
				}),
			)
			expect(status).toBe(200)
			expect(answer.ok).toBe(true)
			const stored = ledgerShow("base", true)
			expect(stored.scenario.document.flows.find((flow) => flow.id === "salary")?.amount).toBe(
				"9000.50",
			)
		},
		SLOW_MS,
	)
})

afterEach(settle, SLOW_MS)
afterAll(async () => {
	await disposeEditor()
})

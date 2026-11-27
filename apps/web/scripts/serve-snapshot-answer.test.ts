// What a write that ran answers beside its Snapshot (#750): the fields a write stated, left out when empty, and a
// landed write whose read failed answering `written_reread_failed` with them ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { describe, expect, test } from "bun:test"
import { snapshot } from "../src/lib/contract"
import { writtenRereadFailed } from "../src/lib/edit/failure"
import { demoSnapshotJson } from "./demo-snapshot"
import { answerOf, answerWritten } from "./serve-snapshot-answer"

const DEMO = snapshot.parse(await demoSnapshotJson())
const BUSY = { code: "database_busy", exitCode: 3, message: "The ledger is busy." }
const STATED = {
	result: { counts: { added: 1, unchanged: 0 } },
	droppedAnchors: ["flows.fund.end"],
	droppedOwners: ["flows.rent"],
	replaced: true,
}

/** The answer's JSON, at 200. */
type Answer = {
	ok: boolean
	error?: unknown
	result?: unknown
	replaced?: boolean
	droppedAnchors?: string[]
	droppedOwners?: string[]
}

async function body(answer: Response): Promise<Answer> {
	expect(answer.status).toBe(200)
	return (await answer.json()) as Answer
}

describe("answerOf", () => {
	test("leaves out an empty list, no result and a false flag", async () => {
		const answer = await body(
			answerOf(
				{ ok: true, snapshot: DEMO },
				{ droppedAnchors: [], droppedOwners: [], replaced: false },
			),
		)
		expect(answer.ok).toBe(true)
		expect(Object.keys(answer).sort()).toEqual(["ok", "snapshot"])
	})

	test("answers every field a write stated", async () => {
		const answer = await body(answerOf({ ok: true, snapshot: DEMO }, STATED))
		expect(answer).toMatchObject(STATED)
	})

	test("answers a read that wrote nothing with its own error", async () => {
		expect(await body(answerOf({ ok: false, error: BUSY }))).toEqual({ ok: false, error: BUSY })
	})
})

describe("answerWritten", () => {
	test("answers a landed write whose read failed with written_reread_failed and what it stated", async () => {
		const answer = await body(answerWritten({ ok: false, error: BUSY }, STATED))
		expect(answer).toEqual({ ok: false, error: writtenRereadFailed(), ...STATED })
		expect(answer.error).not.toEqual(BUSY)
	})

	test("answers the Snapshot read after a write that landed", async () => {
		const answer = await body(answerWritten({ ok: true, snapshot: DEMO }, STATED))
		expect(answer.ok).toBe(true)
		expect(answer.replaced).toBe(true)
	})
})

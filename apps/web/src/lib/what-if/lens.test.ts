import { describe, expect, test } from "bun:test"
import { DEMO } from "../view/what-if/fixtures.test-support"
import { type WhatIfAnswer, whatIfAnswer } from "./answer"
import { lensFor, readsOf, sameChanges } from "./lens"
import { startWhatIf, switchedOff, withSet } from "./session"

const HASH = `jcs1:sha256:${"ab".repeat(32)}`
const session = switchedOff(startWhatIf("base", HASH), "flows.gym")
/** An answer of the Demo's reads, with any read replaced; parsed by the contract, so it is one the server could send. */
function answerOf(replace: Record<string, unknown> = {}): Extract<WhatIfAnswer, { ok: true }> {
	const parsed = whatIfAnswer.parse({
		ok: true,
		reads: {
			projection: DEMO.reads.projections["retire-early"],
			fi: DEMO.reads.fi["retire-early"],
			compare: DEMO.reads.compare,
			chance: null,
			...replace,
		},
	})
	if (!parsed.ok) throw new Error("the answer is ok")
	return parsed
}

describe("the reads of an answer", () => {
	test("each read that succeeded and parses is data; one the CLI refused is null", () => {
		const reads = readsOf(
			answerOf({ fi: { argv: [], ok: false, error: { code: "x", exitCode: 1, message: "no" } } }),
		)
		expect(reads.run).not.toBeNull()
		expect(reads.compare).not.toBeNull()
		expect(reads.fi).toBeNull()
		expect(reads.chance).toBeNull()
	})

	test("data that is not the contract's is null, not shown", () => {
		const reads = readsOf(answerOf({ projection: { argv: [], ok: true, data: { nope: 1 } } }))
		expect(reads.run).toBeNull()
	})

	test("a refused request has no reads", () => {
		const reads = readsOf({ ok: false, error: { code: "x", exitCode: 1, message: "no" } })
		expect(reads).toEqual({ run: null, fi: null, compare: null, chance: null })
	})
})

describe("when a page may show the session", () => {
	const reads = readsOf(answerOf())

	test("on the session's plan, for the changes the reads answer", () => {
		expect(lensFor("base", session, session, reads)?.plan).toBe("base")
	})

	test("never on another plan", () => {
		expect(lensFor("retire-early", session, session, reads)).toBeNull()
	})

	test("never for an answer to earlier changes, or with no session, answer or change", () => {
		const later = withSet(session, "flows.salary.amount", "1.00")
		expect(sameChanges(session, later)).toBe(false)
		expect(lensFor("base", later, session, reads)).toBeNull()
		expect(lensFor("base", null, session, reads)).toBeNull()
		expect(lensFor("base", session, null, reads)).toBeNull()
		expect(lensFor("base", session, session, null)).toBeNull()
		const empty = startWhatIf("base", HASH)
		expect(lensFor("base", empty, empty, reads)).toBeNull()
	})

	test("the same changes under a new hash are still the answer's changes", () => {
		expect(
			sameChanges(session, { ...session, contentHash: `jcs1:sha256:${"cd".repeat(32)}` }),
		).toBe(true)
	})
})

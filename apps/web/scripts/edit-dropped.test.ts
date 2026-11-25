import { afterAll, afterEach, describe, expect, test } from "bun:test"
import {
	disposeEditor,
	hashOf,
	ledgerShow,
	postEdit,
	SLOW_MS,
	setupEditor,
	shownOf,
} from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"

const HOUSEHOLD = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [{ path: "flows.fund.end", person: "me", age: 61 }],
}

const OWNED = {
	schemaVersion: 2,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [],
	owners: [{ path: "flows.rent", person: "me" }],
}

describe("an Edit that drops household anchors, against the real traj", () => {
	test(
		"answers the anchors it dropped, and an Edit that drops none answers none",
		async () => {
			await setupEditor()
			const set = await postEdit(
				JSON.stringify({
					kind: "set-household",
					name: "base",
					contentHash: hashOf("base"),
					household: HOUSEHOLD,
				}),
			)
			if (!set.answer.ok) throw new Error(set.answer.error.message)
			expect(set.answer.droppedAnchors).toBeUndefined()

			const read = ledgerShow("base", true).scenario
			const flows = read.document.flows.filter((flow) => flow.id !== "fund")
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "apply-plan",
					name: "base",
					contentHash: read.contentHash,
					document: { ...read.document, flows },
				}),
			)
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.droppedAnchors).toEqual(["flows.fund.end"])
			expect(shownOf(answer, "base").scenario.household?.anchors).toEqual([])
		},
		SLOW_MS,
	)
})

describe("an Edit that drops household Owners, against the real traj", () => {
	test(
		"answers the Owners it dropped, and an Edit that drops none answers none",
		async () => {
			await setupEditor()
			const set = await postEdit(
				JSON.stringify({
					kind: "set-household",
					name: "base",
					contentHash: hashOf("base"),
					household: OWNED,
				}),
			)
			if (!set.answer.ok) throw new Error(set.answer.error.message)
			expect(set.answer.droppedOwners).toBeUndefined()

			const read = ledgerShow("base", true).scenario
			const flows = read.document.flows.filter((flow) => flow.id !== "rent")
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "apply-plan",
					name: "base",
					contentHash: read.contentHash,
					document: { ...read.document, flows },
				}),
			)
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.droppedOwners).toEqual(["flows.rent"])
			expect(shownOf(answer, "base").scenario.household?.owners).toEqual([])
		},
		SLOW_MS,
	)
})

afterEach(settle, SLOW_MS)
afterAll(disposeEditor)

import { describe, expect, test } from "bun:test"
import { RAN } from "../../client/what-if.test-support"
import { accountValues } from "../contract"
import { editAnswer } from "./answer"
import { writtenRereadFailed } from "./failure"
import { editOutcome } from "./outcome"

const GOLDEN = new URL("../../../../cli/src/account/value/fixtures/values.output", import.meta.url)
const result = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))

const LANDED = editAnswer.parse({
	ok: false,
	error: writtenRereadFailed(),
	result,
	droppedAnchors: ["flows.fund.end"],
	droppedOwners: ["flows.rent"],
	replaced: true,
})

const REFUSED = editAnswer.parse({
	ok: false,
	error: { code: "not_found", exitCode: 3, message: "no such plan" },
})

describe("what one Edit answer comes to", () => {
	test("an answer the page cannot read", () => {
		expect(editOutcome(null)).toEqual({ kind: "unreadable" })
	})

	test("a refusal keeps the CLI's error", () => {
		expect(editOutcome(REFUSED)).toEqual({
			kind: "refused",
			error: { code: "not_found", exitCode: 3, message: "no such plan" },
		})
	})

	test("a write that landed while its read failed is written, with what it stated and no Snapshot", () => {
		expect(editOutcome(LANDED)).toEqual({
			kind: "written",
			snapshot: null,
			result,
			droppedAnchors: ["flows.fund.end"],
			droppedOwners: ["flows.rent"],
			replaced: true,
		})
	})

	test("a write whose read succeeded is written with the Snapshot", () => {
		const answer = editAnswer.parse(RAN)
		if (!answer.ok) throw new Error("the answer is a write that ran")
		expect(editOutcome(answer)).toEqual({
			kind: "written",
			snapshot: answer.snapshot,
			result: null,
			droppedAnchors: [],
			droppedOwners: [],
			replaced: false,
		})
	})
})

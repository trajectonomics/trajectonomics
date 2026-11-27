import { describe, expect, test } from "bun:test"
import { demoSnapshotJson } from "../../../scripts/demo-snapshot"
import { accountValues, errorBody, snapshot } from "../contract"
import { editAnswer, previewAnswer } from "./answer"

const DEMO = snapshot.parse(await demoSnapshotJson())
const ERROR = errorBody.parse({ code: "not_found", exitCode: 3, message: "No plan." })
const RESULT = accountValues.parse({
	dryRun: false,
	file: "-",
	against: { id: "gains", name: "Gains" },
	values: [],
	counts: { added: 0, unchanged: 0 },
})
const STATED = {
	result: RESULT,
	droppedAnchors: ["flows.fund.end"],
	droppedOwners: ["flows.rent"],
	replaced: true,
}

describe("the Edit answer", () => {
	test("an ok answer carries the plan a write replaced, and only as true", () => {
		expect(editAnswer.safeParse({ ok: true, snapshot: DEMO, replaced: true }).success).toBe(true)
		expect(editAnswer.safeParse({ ok: true, snapshot: DEMO, replaced: false }).success).toBe(false)
	})

	test("a failed answer carries what the landed write stated", () => {
		const parsed = editAnswer.safeParse({ ok: false, error: ERROR, ...STATED })
		expect(parsed.success).toBe(true)
		expect(parsed.success && parsed.data.replaced).toBe(true)
	})

	test("a preview's refusal carries no result: nothing was written", () => {
		const refused = previewAnswer.safeParse({ ok: false, error: ERROR, ...STATED })
		expect(refused.success).toBe(false)
	})
})

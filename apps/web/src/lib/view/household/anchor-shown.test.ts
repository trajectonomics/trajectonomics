import { describe, expect, test } from "bun:test"
import type { ErrorBody, HouseholdAnchor } from "../../contract"
import { anchorShown } from "./anchor-shown"

const anchor = (path: string): HouseholdAnchor => ({ path, person: "me", at: "joins" })
const SENT = {
	anchors: [anchor("flows.salary.start"), anchor("flows.rent.start"), anchor("flows.salary.end")],
	path: "flows.salary.end",
}
const MESSAGE = "The end is before the start."

function shown(path: string, when = "age") {
	const failure: ErrorBody = { code: "END_BEFORE_START", exitCode: 2, message: MESSAGE, path }
	return anchorShown({}, { failure, message: MESSAGE }, SENT, when)
}

describe("anchorShown", () => {
	test("an end refused at the same item's start anchor lands on the new anchor's Age", () => {
		for (const path of ["document.anchors.0.path", "document.anchors.0"]) {
			expect(shown(path).at("age")).toBe(MESSAGE)
			expect(shown(path).general).toBeUndefined()
		}
	})

	test("a refusal at the new anchor's own path keeps its field", () => {
		expect(shown("document.anchors.2.path").at("age")).toBe(MESSAGE)
		expect(shown("document.anchors.2.person").at("person")).toBe(MESSAGE)
	})

	test("a refusal at another item's anchor, or at another anchor's field, is the form's own problem", () => {
		for (const path of ["document.anchors.1.path", "document.anchors.0.person"]) {
			expect(shown(path).general).toBe(MESSAGE)
			expect(shown(path).at("age")).toBeUndefined()
			expect(shown(path).at("person")).toBeUndefined()
		}
	})

	test("with no Age field on the form, the sentence is the form's own, never hidden", () => {
		expect(shown("document.anchors.0.path", "joins").general).toBe(MESSAGE)
		expect(shown("document.anchors.2.path", "joins").general).toBe(MESSAGE)
	})
})

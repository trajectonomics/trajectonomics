import { describe, expect, test } from "bun:test"
import { anchorChoices } from "./anchors"
import { demoPlan } from "./fixtures.test-support"

const base = demoPlan("base")

function choice(doc = base.doc) {
	return anchorChoices(doc, base.household, "9999-12-31").find(
		(one) => one.value === "anchor:flows.fund.end",
	)
}

describe("the estate anchor choices name the Flow a household pins", () => {
	test("a labelled Flow shows the plan's label, and the value stays the anchor path", () => {
		const doc = structuredClone(base.doc)
		const flow = doc.flows.find((one) => one.id === "fund")
		if (flow === undefined) throw new Error("the Demo moves money to fund")
		flow.displayLabel = "Emergency fund"
		const found = choice(doc)
		expect(found?.label).toMatch(/^When Emergency fund ends, at /)
		expect(found?.value).toBe("anchor:flows.fund.end")
	})

	test("an unlabelled Flow keeps its id", () => {
		expect(choice()?.label).toMatch(/^When fund ends, at /)
	})
})

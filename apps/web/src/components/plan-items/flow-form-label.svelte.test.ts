import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { Snapshot } from "../../lib/contract"
import { documentRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import FlowForm from "./FlowForm.svelte"

/** The planner's fixture with the plan's name for its salary, which the form edits. */
function plan() {
	const doc = planDocument()
	const salary = doc.flows.find((flow) => flow.id === "salary")
	if (salary === undefined) throw new Error("the fixture has no salary")
	salary.displayLabel = "Salary"
	const snapshot: Snapshot = structuredClone(DEMO)
	snapshot.reads.documents["base"] = documentRead(doc)
	return { doc, salary, snapshot }
}

const { doc, salary, snapshot } = plan()

beforeEach(() => replaceSnapshot(snapshot))
afterAll(() => snapshotLoader.replace(LOADING))

describe("the Flow form's name matches the drawer's heading", () => {
	test("a labelled Flow names the form by the plan's label", () => {
		const body = render(FlowForm, {
			props: {
				kind: "income",
				name: "base",
				contentHash: "jcs1:sha256:abc",
				doc,
				household: null,
				existing: salary,
				onDone: () => {},
			},
		}).body
		expect(body).toContain('aria-label="Edit Salary"')
	})
})

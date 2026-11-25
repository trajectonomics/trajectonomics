import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { PayoutDraft } from "../../lib/view/plan-items/account-income"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import PayoutFields from "./PayoutFields.svelte"

/** The Demo with a label on its retirement Milestone, as a plan that states one reads. */
function labelled() {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	read.data.scenario.document.milestones = [{ id: "retire", displayLabel: "Retirement" }]
	return next
}

const draft = (): PayoutDraft => ({
	rate: "",
	frequency: "",
	rounding: "",
	from: "milestone",
	milestone: "",
	anchor: "",
	date: "",
	kind: "",
})

const body = () =>
	render(PayoutFields, {
		props: {
			draft: draft(),
			shown: { at: () => undefined, general: undefined },
			milestones: ["retire"],
			anchors: [],
			taxed: false,
		},
	}).body

beforeEach(() => replaceSnapshot(DEMO))
afterAll(() => snapshotLoader.replace(LOADING))

describe("the payout form's Milestone picker", () => {
	test("shows the name the plan states and keeps the id as the option's value", () => {
		replaceSnapshot(labelled())
		expect(body()).toContain('<option value="retire">Retirement</option>')
	})

	test("shows the id when the plan states no label", () => {
		expect(body()).toContain('<option value="retire">retire</option>')
	})
})

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

/** The Demo with two Milestones the plan names alike, which only their ids tell apart. */
function twins() {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	read.data.scenario.document.milestones = [
		{ id: "retire", displayLabel: "Retirement" },
		{ id: "retire-2", displayLabel: "Retirement" },
	]
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

const body = (milestones = ["retire"]) =>
	render(PayoutFields, {
		props: {
			draft: draft(),
			shown: { at: () => undefined, general: undefined },
			milestones,
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

	test("two Milestones of one label take their ids, so the picker can tell them apart", () => {
		replaceSnapshot(twins())
		const options = body(["retire", "retire-2"])
		expect(options).toContain('<option value="retire">Retirement (retire)</option>')
		expect(options).toContain('<option value="retire-2">Retirement (retire-2)</option>')
	})
})

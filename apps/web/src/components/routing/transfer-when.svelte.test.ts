import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { TransferContext, TransferDraft } from "../../lib/view/routing/transfer-draft"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import TransferWhen from "./TransferWhen.svelte"

/** The Demo with a label on its retirement Milestone, as a plan that states one reads. */
function labelled() {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	read.data.scenario.document.milestones = [{ id: "retire", displayLabel: "Retirement" }]
	return next
}

const ctx: TransferContext = { milestones: ["retire"], anchors: [], asOf: "2027-01-01" }
const draft = (): TransferDraft => ({
	source: "",
	target: "",
	how: "all",
	amount: "",
	growth: "none",
	rate: "",
	share: "",
	frequency: "once",
	when: "milestone",
	date: "",
	milestone: "",
	anchor: "",
	end: "",
	realise: false,
})

const body = () =>
	render(TransferWhen, {
		props: { draft: draft(), ctx, shown: { at: () => undefined, general: undefined } },
	}).body

beforeEach(() => replaceSnapshot(DEMO))
afterAll(() => snapshotLoader.replace(LOADING))

describe("the transfer form's Milestone picker", () => {
	test("shows the name the plan states and keeps the id as the option's value", () => {
		replaceSnapshot(labelled())
		expect(body()).toContain('<option value="retire">Retirement</option>')
	})

	test("shows the id when the plan states no label", () => {
		expect(body()).toContain('<option value="retire">retire</option>')
	})
})

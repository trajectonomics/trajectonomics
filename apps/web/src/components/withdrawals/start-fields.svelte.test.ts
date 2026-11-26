import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import type { WithdrawalDraft } from "../../lib/view/withdrawals/draft"
import StartFields from "./StartFields.svelte"

/** The Demo with a label on its retirement Milestone, as a plan that states one reads. */
function labelled() {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	read.data.scenario.document.milestones = [{ id: "retire", displayLabel: "Retirement" }]
	return next
}

const draft = (): WithdrawalDraft => ({
	how: "",
	frequency: "",
	amount: "",
	rate: "",
	steps: [],
	floor: { amount: "", growth: "", rate: "" },
	ceiling: { amount: "", growth: "", rate: "" },
	upper: { band: "", move: "" },
	lower: { band: "", move: "" },
	rounding: "",
	portfolio: [],
	startMode: "milestone",
	milestone: "",
	start: "",
	stops: [],
})

const body = () =>
	render(StartFields, {
		props: {
			draft: draft(),
			shown: { at: () => undefined, general: undefined },
			milestones: ["retire"],
			plan: "base",
			anchor: null,
			stoppable: [],
		},
	}).body

beforeEach(() => replaceSnapshot(DEMO))
afterAll(() => snapshotLoader.replace(LOADING))

describe("the withdrawal form's Milestone picker", () => {
	test("shows the name the plan states and keeps the id as the option's value", () => {
		replaceSnapshot(labelled())
		expect(body()).toContain('<option value="retire">Retirement</option>')
	})

	test("shows the id when the plan states no label", () => {
		expect(body()).toContain('<option value="retire">retire</option>')
	})
})

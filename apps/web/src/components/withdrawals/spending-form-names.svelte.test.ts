import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { scenarioFlow } from "../../lib/contract"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import { CTX } from "../../lib/view/withdrawals/fixtures.test-support"
import SpendingForm from "./SpendingForm.svelte"

const HASH = `jcs1:sha256:${"ab".repeat(32)}`

/** The Demo's base plan with a label on the Flow the Withdrawals form edits. */
function labelledDemo() {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads base")
	const flow = read.data.scenario.document.flows.find((one) => one.id === "retirement-spending")
	if (flow === undefined) throw new Error("the Demo has a spending Flow")
	flow.displayLabel = "Retirement spending"
	return next
}

afterAll(() => {
	setTestUrl("http://127.0.0.1/")
	snapshotLoader.replace(LOADING)
})

describe("the Withdrawals form names the Flow it edits", () => {
	test("the form's name is the plan's label, not the Flow's id", () => {
		replaceSnapshot(labelledDemo())
		setTestUrl("http://127.0.0.1/optimize/withdrawals/?scenario=base")
		const flow = scenarioFlow.parse({
			id: "retirement-spending",
			kind: "expense",
			frequency: "monthly",
			start: "2026-10-31",
			amount: "40000.00",
			growth: "inflation",
		})
		const body = render(SpendingForm, {
			props: {
				name: "base",
				contentHash: HASH,
				ctx: { ...CTX, doc: { ...CTX.doc, flows: [...CTX.doc.flows, flow] } },
				household: null,
				flowId: "retirement-spending",
				onDone: () => {},
			},
		}).body
		expect(body).toContain('aria-label="Edit Retirement spending"')
		expect(body).not.toContain('aria-label="Edit retirement-spending"')
	})
})

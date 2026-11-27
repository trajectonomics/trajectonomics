import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { ScenarioDocument, ScenarioFlow, Snapshot } from "../../lib/contract"
import { documentRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import FlowForm from "./FlowForm.svelte"

const taxed = planDocument()
const untaxed: ScenarioDocument = { ...planDocument() }
delete untaxed.levies
const snapshot: Snapshot = structuredClone(DEMO)
snapshot.reads.documents["base"] = documentRead(taxed)

beforeEach(() => replaceSnapshot(snapshot))
afterAll(() => snapshotLoader.replace(LOADING))

function form(doc: ScenarioDocument, existing?: ScenarioFlow | undefined) {
	return render(FlowForm, {
		props: {
			kind: "income" as const,
			name: "base",
			contentHash: "jcs1:sha256:abc",
			doc,
			household: null,
			existing,
			onDone: () => {},
		},
	}).body
}

describe("a new income's tax label notice", () => {
	test("a new income in a taxed plan shows the command that sets its label", () => {
		const body = form(taxed)
		expect(body).toContain("only counts income it knows by its label")
		expect(body).toContain("traj scenario tax base --from-stored --label &lt;flow>=&lt;label>")
	})

	test("no notice for an edit, or for a plan without a Levy", () => {
		expect(form(taxed, taxed.flows[0])).not.toContain("only counts income it knows by its label")
		expect(form(untaxed)).not.toContain("only counts income it knows by its label")
	})
})

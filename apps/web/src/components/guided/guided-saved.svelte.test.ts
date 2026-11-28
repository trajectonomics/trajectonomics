import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { demoSnapshotJson } from "../../../scripts/demo-snapshot"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { guidedSession } from "../../client/guided-plan.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { type Snapshot, snapshot } from "../../lib/contract"
import GuidedPlanPage from "./GuidedPlanPage.svelte"

const DEMO: Snapshot = snapshot.parse(await demoSnapshotJson())
const page = () => render(GuidedPlanPage, { props: { snapshot: DEMO } }).body

beforeEach(() => {
	setTestUrl("http://127.0.0.1/plans/new/")
	guidedSession.cancel()
	whatIfSession.end()
})
afterEach(() => {
	guidedSession.cancel()
	whatIfSession.end()
	setTestUrl("http://127.0.0.1/")
})

describe("the sentence a guided save leaves", () => {
	test("replaces the form with one sentence that says the plan saved, and points at Open", () => {
		guidedSession.saved = "guided"
		const body = page()
		expect(body).toContain("Saved guided. Open it.")
		expect(body).not.toContain("Settle the What-if")
		expect(body).toContain("Open guided")
		expect(body).toContain('tabindex="-1"')
		expect(body).not.toContain("Save plan")
		expect(body).not.toContain("Stop-work age")
	})

	test("says to settle the What-if only while one holds another plan", () => {
		guidedSession.saved = "guided"
		whatIfSession.setOff("base", "hash", "flows.rent", true)
		const body = page()
		expect(body).toContain("Saved guided. Settle the What-if above, then open it.")
		expect(body).toContain("Open guided")
	})
})

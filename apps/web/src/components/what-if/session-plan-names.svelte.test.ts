import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { HASH, useSessionHooks } from "../../client/what-if.test-support"
import type { Snapshot } from "../../lib/contract"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import { startWhatIf, withSet } from "../../lib/what-if/session"
import WhatIfChanges from "./WhatIfChanges.svelte"

useSessionHooks()

afterAll(() => {
	setTestUrl("http://127.0.0.1/")
	snapshotLoader.replace(LOADING)
})

const RULE = {
	kind: "initialRate" as const,
	portfolio: ["cash"],
	rateBps: "4.00",
	rounding: "halfUp" as const,
}

/** The Demo's plan under two names, each stating a different label for the same spending Flow. */
function twoPlans(): Snapshot {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads base")
	const named = (label: string) => {
		const doc = structuredClone(read.data)
		for (const flow of doc.scenario.document.flows) {
			if (flow.id === "retirement-spending") flow.displayLabel = label
		}
		return doc
	}
	next.params = { ...next.params, scenarios: ["alpha", "beta"] }
	next.reads.documents = {
		alpha: { ...read, data: named("Alpha spending") },
		beta: { ...read, data: named("Beta spending") },
	}
	return next
}

describe("the What-if bar words a change by its session plan", () => {
	test("the session's own plan names the change, not the plan the address shows", () => {
		replaceSnapshot(twoPlans())
		setTestUrl("http://127.0.0.1/overview/?scenario=beta")
		whatIfSession.whatIf = withSet(
			withSet(startWhatIf("alpha", HASH), "flows.retirement-spending.rule", RULE),
			"flows.retirement-spending.rateBps",
			"5.00",
		)
		const body = render(WhatIfChanges, { props: {} }).body
		expect(body).toContain("Alpha spending: spends 4.00%")
		expect(body).toContain("Alpha spending rateBps set to 5.00")
		expect(body).not.toContain("Beta spending")
	})
})

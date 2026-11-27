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

/** The Demo with a salary's employer share in its base document, the shape the form writes (web ADR 0017). */
function withEmployerShare(fund: string): Snapshot {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads base")
	const document = read.data.scenario.document
	document.flows.push({
		id: "salary-employer",
		kind: "contribution",
		frequency: "monthly",
		start: "2026-01-01",
		target: fund,
		funding: "employer",
		derive: {
			measures: [
				{ id: "pay", op: "flow", flow: "salary" },
				{ id: "share", op: "scale", of: "pay", num: 700, den: 10000, rounding: "floor" },
			],
			result: "share",
		},
	})
	return next
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
			"flows.retirement-spending.amount",
			"5.00",
		)
		const body = render(WhatIfChanges, { props: {} }).body
		expect(body).toContain("Alpha spending: spends 4.00%")
		expect(body).toContain("Alpha spending amount set to 5.00")
		expect(body).not.toContain("Beta spending")
	})

	test("an Account a Flow moves to reads as its ledger name, and only a real employer share says account", () => {
		const accounts = DEMO.reads.accounts
		if (!accounts.ok) throw new Error("the Demo reads its accounts")
		const fund = accounts.data.accounts.find((account) => account.name === "Fund")
		if (fund === undefined) throw new Error("the Demo has a Fund Account")
		replaceSnapshot(withEmployerShare(fund.id))
		whatIfSession.whatIf = withSet(
			withSet(
				withSet(startWhatIf("base", HASH), "flows.fund.target", fund.id),
				"flows.salary-employer.target",
				fund.id,
			),
			"flows.paid-by-employer.target",
			fund.id,
		)
		const body = render(WhatIfChanges, { props: {} }).body
		expect(body).toContain("move to set to Fund")
		expect(body).toContain("account set to Fund")
		expect(body).toContain("paid-by-employer move to set to Fund")
		expect(body).not.toContain(fund.id)
	})
})

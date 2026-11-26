import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
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

// The Snapshot store is shared by every test file in the process, so it is put back as it was.
afterAll(() => snapshotLoader.replace(LOADING))

/** The Demo with two Milestones the plan names alike, which only their ids tell apart. */
function twins(): Snapshot {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	read.data.scenario.document.milestones = [
		{ id: "retire", displayLabel: "Retirement" },
		{ id: "retire-2", displayLabel: "Retirement" },
	]
	return next
}

beforeEach(() => replaceSnapshot(twins()))

describe("the What-if bar names the Milestone a change sets", () => {
	test("two Milestones of one label take their ids, so the bar tells them apart", () => {
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.rent.startAt", "retire-2")
		const body = render(WhatIfChanges, { props: {} }).body
		expect(body).toContain("set to Retirement (retire-2)")
		expect(body).not.toContain("set to retire-2")
	})
})

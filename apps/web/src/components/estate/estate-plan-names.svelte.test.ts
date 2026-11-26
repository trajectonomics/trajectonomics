import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import EstatePlan from "./EstatePlan.svelte"

/** The Demo with the plan's name for its car Milestone. */
function labelled() {
	const next = structuredClone(DEMO)
	const read = next.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	read.data.scenario.document.milestones = [{ id: "car-paid-off", displayLabel: "Car paid off" }]
	return next
}

beforeEach(() => replaceSnapshot(labelled()))
afterAll(() => snapshotLoader.replace(LOADING))

describe("the Estate page names the Milestones it offers as dates", () => {
	test("a labelled Milestone shows the plan's name in the date choice", () => {
		const snapshot = labelled()
		const body = render(EstatePlan, {
			props: {
				snapshot,
				name: "base",
				terms: "both",
				onTerms: () => {},
				at: "",
				onAt: () => {},
			},
		}).body
		expect(body).toContain("When Car paid off fires")
	})
})

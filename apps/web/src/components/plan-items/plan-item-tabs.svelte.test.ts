import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { Snapshot } from "../../lib/contract"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import PlanItemTabs from "./PlanItemTabs.svelte"

const ARGV = ["scenario", "show", "--decimal", "--json", "--", "base"]

function tabs(snapshot: Snapshot): string {
	return render(PlanItemTabs, {
		props: { snapshot, scenario: "base", editable: true, items: "milestones", onItems: () => {} },
	}).body
}

describe("the Plan's Milestones tab", () => {
	test("shows a failed document read instead of saying the plan has no Milestones", () => {
		const failed: Snapshot = {
			...DEMO,
			reads: {
				...DEMO.reads,
				documents: {
					...DEMO.reads.documents,
					base: {
						argv: ARGV,
						ok: false,
						error: {
							code: "unknown_plan",
							exitCode: 1,
							message: "No plan named base.",
							hint: "List the plans with traj scenario list.",
						},
					},
				},
			},
		}
		const body = tabs(failed)
		expect(body).toContain("The plan of base could not be read")
		expect(body).toContain("No plan named base.")
		expect(body).toContain("List the plans with traj scenario list.")
		expect(body).not.toContain("No milestones in this plan")
	})

	test("says the Snapshot holds no document rather than that there are no Milestones", () => {
		const body = tabs({ ...DEMO, reads: { ...DEMO.reads, documents: {} } })
		expect(body).toContain("No plan document to show")
	})
})

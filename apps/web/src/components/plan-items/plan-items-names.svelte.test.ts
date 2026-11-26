import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { Snapshot } from "../../lib/contract"
import { scenarioFlow } from "../../lib/contract/scenario-show"
import {
	baselineRead,
	documentRead,
	planDocument,
} from "../../lib/view/plan-items/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import PlanItemsList from "./PlanItemsList.svelte"

/** The planner's fixture with an expense that starts at a labelled Milestone. */
function plan() {
	const doc = planDocument()
	doc.milestones = [{ id: "retire", displayLabel: "Retirement" }]
	doc.flows.push(
		scenarioFlow.parse({
			id: "retirement-spending",
			kind: "expense",
			frequency: "monthly",
			start: "2026-10-31",
			amount: "900.00",
			startAt: "retire",
		}),
	)
	const snapshot: Snapshot = structuredClone(DEMO)
	snapshot.reads.documents["base"] = documentRead(doc)
	return { doc, snapshot }
}

const { doc, snapshot } = plan()

beforeEach(() => replaceSnapshot(snapshot))
afterAll(() => snapshotLoader.replace(LOADING))

/** The markup with Svelte's render comments dropped, so a sentence reads as one string. */
const plain = (html: string) => html.replace(/<!--[\s\S]*?-->/g, "")

describe("the planner list names the Milestone a Flow starts at", () => {
	test("a labelled Milestone shows the plan's name as plain text", () => {
		const body = render(PlanItemsList, {
			props: {
				kind: "expense",
				name: "base",
				doc,
				household: null,
				baseline: baselineRead(),
				editable: false,
				contentHash: "h",
			},
		}).body
		expect(plain(body)).toContain(
			'When <span class="wrap-anywhere" data-item="retire" data-kind="milestone">Retirement</span> fires',
		)
	})
})

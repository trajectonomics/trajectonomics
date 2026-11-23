import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import PlanItemsList from "../plan-items/PlanItemsList.svelte"
import ItemSwitch from "./ItemSwitch.svelte"
import WhatIfBar from "./WhatIfBar.svelte"

const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

/** The planner page's list, editable or not: the switches show only on an editable page. */
function list(editable: boolean): string {
	return render(PlanItemsList, {
		props: {
			kind: "income",
			name: "base",
			doc: planDocument(),
			household: null,
			baseline: baselineRead(),
			editable,
			contentHash: HASH,
		},
	}).body
}

describe("the What-if controls", () => {
	test("an item's switch names the item and offers a value to try", () => {
		const body = render(ItemSwitch, {
			props: { plan: "base", contentHash: HASH, path: "flows.gym", label: "gym", onTry: () => {} },
		}).body
		expect(body).toContain('role="switch"')
		expect(body).toContain("Include gym in the what-if")
		expect(body).toContain("Try a value")
		expect(body).toContain("On")
	})

	test("the planner list shows a switch and Try a value on each editable card, and none on a read-only page", () => {
		expect(list(true)).toContain('role="switch"')
		expect(list(true)).toContain("Try a value")
		expect(list(false)).not.toContain('role="switch"')
		expect(list(false)).not.toContain("Try a value")
	})

	test("the session bar is absent without a session, so a page with no changes shows none", () => {
		expect(render(WhatIfBar, { props: {} }).body).not.toContain("What-if session")
	})
})

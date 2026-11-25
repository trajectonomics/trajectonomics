import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { flowDraftOf } from "../../lib/view/plan-items/flows"
import { flowItems } from "../../lib/view/what-if/plan-items"
import type { SetChange } from "../../lib/what-if/overrides"
import FlowCards from "./FlowCards.svelte"
import FlowFields from "./FlowFields.svelte"

const NO_PROBLEMS = { at: () => undefined, general: undefined }
const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

/** The income cards as a What-if that sets those Flow paths holds them. */
function cards(sets: readonly SetChange[]): string {
	const doc = planDocument()
	const view = flowItems(doc, "income", null, { sets, removals: [] })
	return render(FlowCards, {
		props: {
			cards: view.cards,
			marks: view.marks,
			currency: doc.currency,
			editable: false,
			plan: "base",
			contentHash: HASH,
			onEdit: () => {},
			onTry: () => {},
		},
	}).body
}

const rows = (body: string, label: string) =>
	body.match(new RegExp(`<dt[^>]*>${label}</dt>`, "g"))?.length ?? 0

describe("a What-if that changes a Flow's frequency", () => {
	test("a monthly Flow tried once keeps its Ends row, with the baseline's end struck through", () => {
		const body = cards([{ path: "flows.salary.frequency", value: "once" }])
		// The pension runs to the horizon, as before; the salary's struck end must still have a row to sit on.
		expect(rows(body, "Ends")).toBe(2)
		expect(body).toContain("2050-05-14")
	})

	test("a once Flow tried monthly shows its end with nothing struck, as its baseline had no end", () => {
		const body = cards([{ path: "flows.tax-refund.frequency", value: "monthly" }])
		// Both recurring Flows and the tried once Flow have an end now.
		expect(rows(body, "Ends")).toBe(3)
		expect(body).not.toContain("none</s>")
	})
})

describe("the Flow form's Ends field", () => {
	const form = (id: string): string => {
		const flow = planDocument().flows.find((item) => item.id === id)
		return render(FlowFields, {
			props: {
				draft: flowDraftOf(flow),
				kind: "income",
				existing: flow,
				shown: NO_PROBLEMS,
				name: "base",
				anchors: { start: null, end: null },
			},
		}).body
	}

	test("is hidden for a once Flow, which lands on its one date", () => {
		expect(form("tax-refund")).not.toContain('id="flow-end"')
	})

	test("is asked for when the Flow recurs", () => {
		expect(form("salary")).toContain('id="flow-end"')
	})
})

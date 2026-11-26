import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { HASH, useSessionHooks } from "../../client/what-if.test-support"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { flowDraftOf } from "../../lib/view/plan-items/flows"
import { recordOf } from "../../lib/what-if/session"
import FlowFields from "./FlowFields.svelte"
import FlowForm from "./FlowForm.svelte"

useSessionHooks()

const doc = planDocument()
const salary = doc.flows.find((flow) => flow.id === "salary")
const NO_PROBLEMS = { at: () => undefined, general: undefined }
const ANCHORED_END = { start: null, end: "at you, age 70" }

/** The Flow form in what-if mode, after the session has already changed the salary to a once Flow on another date. */
function formAfterTry(): string {
	if (salary === undefined) throw new Error("no salary")
	whatIfSession.tryFlow("base", HASH, {
		stored: recordOf(salary),
		edited: {
			...recordOf(salary),
			id: salary.id,
			frequency: "once",
			start: "2029-01-01",
			end: "2029-01-01",
		},
	})
	return render(FlowForm, {
		props: {
			kind: "income",
			name: "base",
			contentHash: HASH,
			doc,
			household: null,
			existing: salary,
			onDone: () => {},
			tryValue: true,
		},
	}).body
}

/** The Flow fields as the form holds them: once, with the end the household may pin. */
const fields = (
	trying: boolean,
	anchors: { start: string | null; end: string | null } = ANCHORED_END,
): string =>
	render(FlowFields, {
		props: {
			draft: { ...flowDraftOf(salary), frequency: "once" },
			kind: "income",
			existing: salary,
			shown: NO_PROBLEMS,
			name: "base",
			anchors,
			trying,
		},
	}).body

describe("a second try in the same session", () => {
	test("starts the draft from the session's Flow, not the stored one", () => {
		const body = formAfterTry()
		// The stored salary runs monthly from 2026-11-01 to 2050-05-14; the session's is once on 2029-01-01.
		expect(body).toContain("2029-01-01")
		expect(body).not.toContain("2050-05-14")
		expect(body).not.toContain('id="flow-end"')
	})
})

describe("a once try whose end the household pins", () => {
	test("warns in the drawer that applying it to the plan will be refused", () => {
		const body = fields(true)
		expect(body).toContain("applying this one to the plan will be refused")
		expect(body).toContain("at you, age 70")
		expect(body).toContain("text-muted-foreground")
	})

	test("does not warn for a recurring Flow, before the value is tried, or on the anchored date", () => {
		expect(fields(true, { start: null, end: null })).not.toContain("will be refused")
		expect(fields(false)).not.toContain("will be refused")
		const onAnchor = render(FlowFields, {
			props: {
				draft: {
					...flowDraftOf(salary),
					frequency: "once",
					start: "2026-11-01",
					end: "2026-11-01",
				},
				kind: "income",
				existing: salary,
				shown: NO_PROBLEMS,
				name: "base",
				anchors: ANCHORED_END,
				trying: true,
			},
		}).body
		expect(onAnchor).not.toContain("will be refused")
	})

	test("gives the once Ends field a hint that fits it", () => {
		const body = fields(true)
		expect(body).toContain("A once Flow ends when it starts.")
		expect(body).not.toContain("or empty to run to the horizon")
	})

	test("keeps the horizon hint on a recurring Flow", () => {
		const body = render(FlowFields, {
			props: {
				draft: flowDraftOf(salary),
				kind: "income",
				existing: salary,
				shown: NO_PROBLEMS,
				name: "base",
				anchors: { start: null, end: null },
			},
		}).body
		expect(body).toContain("or empty to run to the horizon")
	})
})

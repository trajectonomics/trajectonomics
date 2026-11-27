import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { HASH, useSessionHooks } from "../../client/what-if.test-support"
import { demoPlan } from "../../lib/view/estate/fixtures.test-support"
import { overviewView } from "../../lib/view/overview/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import EstateCard from "../overview/EstateCard.svelte"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import EstateForm from "./EstateForm.svelte"

useSessionHooks()

const form = (name = "base") =>
	render(EstateForm, {
		props: { name, contentHash: HASH, plan: demoPlan(name).doc, onDone: () => {} },
	}).body

afterEach(() => {
	editSession.token = null
	editSession.error = null
	preferences.hidden = false
})
afterAll(() => {
	preferences.hidden = false
	editSession.token = null
})

describe("the form", () => {
	test("a plan with no block opens empty, says each line is the person's own, that inheritance tax is a cost line, and offers a try", () => {
		const body = form("retire-early")
		expect(body).toContain("none is filled in for you")
		expect(body).toContain("Inheritance tax is not worked out")
		expect(body).toContain("Add a cost")
		expect(body).toContain("Add a gift")
		expect(body).not.toContain('value="1')
		expect(body).not.toContain("Save your first line to try")
		expect(body).toContain("Try as a what-if")
	})

	test("a plan with a block shows its lines as the document states them, and offers a try", () => {
		const body = form()
		expect(body).toContain('value="1.00"')
		expect(body).toContain('value="50000.00"')
		expect(body).toContain("In the money of the plan's start")
		expect(body).toContain("Try as a what-if")
		expect(body).toContain("Move up")
	})
})

describe("the Home card: your heirs would receive", () => {
	test("states what heirs receive on the default date, says why that date, and links to the page", () => {
		const body = render(EstateCard, { props: { scenario: overviewView(DEMO).estate } }).body
		expect(body).toContain("Your heirs would receive")
		expect(body).toContain("15.6M")
		expect(body).toContain('title="15,671,500.52"')
		expect(body).toContain("the plan's last year")
		expect(body).toContain('href="/estate/')
		expect(render(OverviewGrid, { props: { view: overviewView(DEMO) } }).body).toContain("/estate/")
	})

	test("says when no settlement cost is set, and hides amounts", () => {
		const other = overviewView({
			...DEMO,
			params: { ...DEMO.params, compare: null, scenarios: ["retire-early"] },
		})
		expect(render(EstateCard, { props: { scenario: other.estate } }).body).toContain(
			"No settlement cost is set",
		)
		preferences.hidden = true
		expect(
			render(EstateCard, { props: { scenario: overviewView(DEMO).estate } }).body,
		).not.toContain("15,671,500.52")
	})
})

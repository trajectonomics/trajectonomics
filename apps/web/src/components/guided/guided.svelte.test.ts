import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { demoSnapshotJson } from "../../../scripts/demo-snapshot"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { editSession } from "../../client/edit.svelte.js"
import { guidedSession } from "../../client/guided-plan.svelte.js"
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
import { type Snapshot, snapshot } from "../../lib/contract"
import { blankPerson } from "../../lib/view/guided/people"
import NewPlanForm from "../plans/NewPlanForm.svelte"
import ProjectionView from "../projection/ProjectionView.svelte"
import GuidedPlanPage from "./GuidedPlanPage.svelte"

const DEMO: Snapshot = snapshot.parse(await demoSnapshotJson())
const page = () => render(GuidedPlanPage, { props: { snapshot: DEMO } }).body

/** Every id an input states, so the test can find the label that names it. */
function inputIds(body: string): string[] {
	return [...body.matchAll(/<input[^>]*\bid="([^"]+)"/g)].flatMap((match) =>
		match[1] === undefined ? [] : [match[1]],
	)
}

/** The stepper's own markup, between its `<ol>` and `</ol>`. */
function stepsOf(body: string): string {
	const start = body.indexOf("<ol")
	const end = body.indexOf("</ol>")
	return start === -1 || end === -1 ? "" : body.slice(start, end)
}

beforeEach(() => {
	setTestUrl("http://127.0.0.1/plans/new/")
	editSession.token = null
	guidedSession.cancel()
})
afterEach(() => {
	guidedSession.cancel()
	editSession.token = null
	taxLabelNotice.clear()
	// The entry-point tests set `?demo=1`: put the default address back, so no later file reads it.
	setTestUrl("http://127.0.0.1/")
})

describe("the guided plan page", () => {
	test("lists the three steps in order, with the current one marked", () => {
		const steps = stepsOf(page())
		expect(steps.indexOf("1. You and your household")).toBeLessThan(steps.indexOf("2. Your money"))
		expect(steps.indexOf("2. Your money")).toBeLessThan(
			steps.indexOf("3. When you would stop working"),
		)
		expect(steps.match(/aria-current="step"/g)).toHaveLength(1)
	})

	test("hides Save and says why when the server gave no token", () => {
		guidedSession.step = "stop"
		guidedSession.name = "guided"
		guidedSession.age = "60"
		const body = page()
		expect(body).not.toContain("Save plan")
		expect(body).toContain(
			'Saving is off here: run <code class="font-mono">traj dashboard</code> to save a plan.',
		)
	})

	test("shows Save when the server gave a token", () => {
		editSession.token = "t"
		guidedSession.step = "stop"
		guidedSession.name = "guided"
		guidedSession.age = "60"
		const body = page()
		expect(body).toContain("Save plan")
		expect(body).not.toContain("Saving is off here")
	})

	test("names every input on every step with a label", () => {
		for (const step of ["household", "money", "stop"] as const) {
			guidedSession.step = step
			guidedSession.name = "guided"
			guidedSession.age = "60"
			const body = page()
			const ids = inputIds(body)
			expect(ids.length).toBeGreaterThan(0)
			for (const id of ids) expect(body).toContain(`<label for="${id}"`)
		}
	})

	test("stacks a money row with flex-wrap and no table", () => {
		guidedSession.step = "money"
		const body = page()
		expect(body).not.toContain("<table")
		expect(body).toContain("flex-wrap")
		expect(body).toContain("per month")
	})

	test("shows no problem on an untouched field, and every problem once Next finds one", () => {
		const first = page()
		expect(first).not.toContain("Enter a name for the person.")
		expect(first).not.toContain("Enter the birth month as YYYY-MM.")
		guidedSession.showProblems = true
		const next = page()
		expect(next).toContain("Enter a name for the person.")
		expect(next).toContain("Enter the birth month as YYYY-MM.")
	})

	test("offers Remove on an added person, named with that person, and never on the holder", () => {
		guidedSession.people = [blankPerson("holder")]
		guidedSession.addPerson(guidedSession.people ?? [], "partner")
		const body = page()
		expect(body).toContain('aria-label="Remove Your partner"')
		expect(body.match(/aria-label="Remove /g)).toHaveLength(1)
	})

	test("replaces the form with one sentence that says the plan saved", () => {
		guidedSession.saved = "guided"
		const body = page()
		expect(body).toContain("Settle the What-if above, then open it.")
		expect(body).toContain("Open guided")
		expect(body).toContain('tabindex="-1"')
		expect(body).not.toContain("Save plan")
		expect(body).not.toContain("Stop-work age")
	})

	test("keeps the tax step off the What-if, whose link would skip the plan switch guard", () => {
		guidedSession.saved = "guided"
		taxLabelNotice.offer({ plan: "guided", flow: "pension", origin: "guided", taxed: true })
		expect(page()).not.toContain("/settings/tax/")
	})

	test("shows the age problem when the stop step comes back with the age already filled", () => {
		editSession.token = "t"
		const holder = {
			...blankPerson("holder"),
			displayLabel: "Me",
			born: "1990-06",
			lifeExpectancy: "90",
		}
		guidedSession.people = [holder]
		guidedSession.step = "stop"
		guidedSession.age = "60"
		guidedSession.name = "guided"
		guidedSession.back()
		guidedSession.back()
		guidedSession.changePerson(guidedSession.people ?? [], 0, { lifeExpectancy: "50" })
		guidedSession.advance()
		guidedSession.advance()
		const body = page()
		expect(body).toContain("Choose an age before your life expectancy (50).")
		expect(body).toContain("disabled")
	})
})

describe("back and cancel", () => {
	test("Back keeps every answer", () => {
		guidedSession.step = "money"
		guidedSession.name = "guided"
		guidedSession.age = "60"
		guidedSession.step = "stop"
		expect(guidedSession.step).toBe("stop")
		guidedSession.back()
		expect(String(guidedSession.step)).toBe("money")
		expect(guidedSession.name).toBe("guided")
		expect(guidedSession.age).toBe("60")
	})

	test("Cancel forgets the answers", () => {
		guidedSession.step = "stop"
		guidedSession.name = "guided"
		guidedSession.age = "60"
		guidedSession.cancel()
		expect(String(guidedSession.step)).toBe("household")
		expect(guidedSession.name).toBe("")
		expect(guidedSession.age).toBe("")
		expect(guidedSession.people).toBeNull()
	})
})

describe("the entry points", () => {
	test("the new plan form links to the guided steps under the base path", () => {
		setTestUrl("http://127.0.0.1/plans/?demo=1")
		const body = render(NewPlanForm, {
			props: {
				stored: [],
				names: [],
				asOf: DEMO.params.asOf,
				copyOf: "",
				onDone: () => undefined,
			},
		}).body
		expect(body).toContain('href="/plans/new/?demo=1"')
		expect(body).toContain("Set up step by step")
	})

	test("the empty Plan links to a first plan under the base path", () => {
		setTestUrl("http://127.0.0.1/projection/?demo=1")
		const body = render(ProjectionView, {
			props: {
				snapshot: DEMO,
				names: [],
				projections: {},
				scenario: "",
				household: null,
				fi: undefined,
				chance: undefined,
				editable: false,
				terms: "both",
				onTerms: () => undefined,
				chart: "",
				onChart: () => undefined,
				items: "income",
				onItems: () => undefined,
			},
		}).body
		expect(body).toContain("Set up a first plan")
		expect(body).toContain('href="/plans/new/?demo=1"')
	})
})

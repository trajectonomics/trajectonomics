import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { preferences } from "../../client/preferences.svelte.js"
import { householdOf, personNames } from "../../lib/view/item-names"
import { focusOf } from "../../lib/view/overview/focus"
import { heroOf } from "../../lib/view/overview/hero"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import ChanceGrid from "./ChanceGrid.svelte"
import FocusButtons from "./FocusButtons.svelte"
import OverviewFocus from "./OverviewFocus.svelte"

/** The props the Overview passes for one plan. */
function propsOf(plan: string) {
	const read = DEMO.reads.projections[plan]
	if (read === undefined || !read.ok) throw new Error(`the Demo has ${plan}`)
	const wanted = read.data.scenario.name
	const hero = heroOf(DEMO, wanted)
	return {
		focus: focusOf(DEMO, wanted),
		run: read.data,
		people: personNames(householdOf(DEMO, wanted)),
		warnings: hero?.warnings ?? [],
		warningsLabel: hero?.warningsLabel ?? null,
	}
}

describe("OverviewFocus", () => {
	test("labels the section with the whole answer and writes only the answer and the button on screen", () => {
		const props = propsOf("base")
		const { body } = render(OverviewFocus, { props })
		expect(body).toContain(
			"You could stop working in Oct 2040, when you are 50 and your partner is 48.",
		)
		expect(body).toContain("Your money lasts to 2053 in 193 of 200 markets tested.")
		expect(body).toContain("Oct 2040")
		expect(body).toContain('data-focus-answer="true"')
		expect(body).toContain('href="/fi/"')
		expect(body).not.toContain("See your plan")
		expect(body).not.toContain('href="/projection/"')
		expect(body).toContain(">193</span><span")
		expect(body).toContain("/200")
		expect(body).not.toContain("Where do you stand?")
	})

	test("says the shortfall in the heading, and writes the month on the chart", () => {
		const props = propsOf("retire-early")
		const { body } = render(OverviewFocus, { props })
		expect(body).toContain("Your money runs out in Feb 2053, at 62.")
		expect(body).toContain("39,410.06 THB short by the end of the plan.")
		expect(body).toContain("Feb 2053")
		expect(body).toContain('data-focus-answer="true"')
		expect(body).toContain("See where it runs out")
		expect(body).toContain("−39.4k")
	})

	test("masks the shortfall with Hide amounts on, and still draws the chart", () => {
		const props = propsOf("retire-early")
		preferences.hidden = true
		let body = ""
		try {
			body = render(OverviewFocus, { props }).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain("The amount short by the end of the plan is hidden.")
		expect(body).not.toContain("39,410.06")
		expect(body).not.toContain("39.4k")
		expect(body).toContain("•••••")
		expect(body).toContain("<svg")
	})

	test("shows the FI notes worth checking, and no primary action on an answered plan", () => {
		setTestUrl("http://127.0.0.1/?demo=1&scenario=base")
		try {
			const props = propsOf("base")
			const first = props.warnings[0]
			if (first === undefined) throw new Error("the Demo's base plan has a note to check")
			const { body } = render(OverviewFocus, { props })
			expect(body.match(/data-primary-action/g) ?? []).toHaveLength(0)
			expect(body).toContain("data-focus-chip")
			expect(body).toContain('aria-label="1 thing to check"')
			expect(body).toContain(`href="/fi/?demo=1&amp;scenario=base#${first.anchor}"`)
			expect(body).not.toContain('href="/health/"')
		} finally {
			setTestUrl("http://127.0.0.1/")
		}
	})

	test("shows the notes chip in the runs-out and the unreachable cases too", () => {
		const runsOut = propsOf("retire-early")
		expect(runsOut.warnings.length).toBeGreaterThan(0)
		expect(render(OverviewFocus, { props: runsOut }).body).toContain("data-focus-chip")

		const copy = structuredClone(DEMO)
		const run = copy.reads.projections["retire-early"]
		if (run === undefined || !run.ok) throw new Error("the Demo has retire-early")
		run.data.runsOut = null
		const hero = heroOf(copy, "retire-early")
		const { body } = render(OverviewFocus, {
			props: {
				focus: focusOf(copy, "retire-early"),
				run: run.data,
				people: personNames(householdOf(copy, "retire-early")),
				warnings: hero?.warnings ?? [],
				warningsLabel: hero?.warningsLabel ?? null,
			},
		})
		expect(body).toContain("Not by 2053")
		expect(body).toContain("data-focus-chip")
	})
})

describe("ChanceGrid", () => {
	test("draws one square per market, the succeeded ones filled", () => {
		const { body } = render(ChanceGrid, { props: { counts: { succeeded: 193, paths: 200 } } })
		expect(body.match(/bg-accent/g)).toHaveLength(193)
		expect(body.match(/border-muted-foreground\/40/g)).toHaveLength(7)
	})
})

describe("FocusButtons", () => {
	test("draws one primary button and no chip without a warning", () => {
		const { body } = render(FocusButtons, {
			props: {
				button: { label: "Set up a first plan", href: "/plans/new/", external: false },
				warnings: [],
				warningsLabel: null,
			},
		})
		expect(body.match(/data-primary-action/g)).toHaveLength(1)
		expect(body).not.toContain("data-focus-chip")
	})

	test("draws only the chip when the focus point has no button", () => {
		const { body } = render(FocusButtons, {
			props: {
				button: null,
				warnings: [{ text: "Note", anchor: "note-1", label: "Note 1" }],
				warningsLabel: "1 thing to check",
			},
		})
		expect(body).not.toContain("data-primary-action")
		expect(body).toContain("data-focus-chip")
		expect(body).toContain('aria-label="1 thing to check"')
	})
})

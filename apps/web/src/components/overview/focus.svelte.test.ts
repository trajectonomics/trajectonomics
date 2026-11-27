import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { healthWarning } from "../../lib/view/health/warning"
import { householdOf, personNames } from "../../lib/view/item-names"
import { focusOf } from "../../lib/view/overview/focus"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import ChanceGrid from "./ChanceGrid.svelte"
import FocusButtons from "./FocusButtons.svelte"
import OverviewFocus from "./OverviewFocus.svelte"

/** The props the Overview passes for one plan. */
function propsOf(plan: string) {
	const read = DEMO.reads.projections[plan]
	if (read === undefined || !read.ok) throw new Error(`the Demo has ${plan}`)
	const wanted = read.data.scenario.name
	return {
		focus: focusOf(DEMO, wanted),
		run: read.data,
		people: personNames(householdOf(DEMO, wanted)),
		warning: healthWarning(DEMO),
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
		expect(body).toContain("See your plan")
		expect(body).toContain('href="/projection/"')
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

	test("shows one primary action and, beside it, the health count when a check fails", () => {
		const copy = structuredClone(DEMO)
		const doctor = copy.reads.doctor
		if (!doctor.ok) throw new Error("the Demo reads its health")
		doctor.data.checks[0] = { name: "writable", status: "fail", detail: "Broken." }
		doctor.data.ok = false
		const read = copy.reads.projections["base"]
		if (read === undefined || !read.ok) throw new Error("the Demo has base")
		const { body } = render(OverviewFocus, {
			props: {
				focus: focusOf(copy, "base"),
				run: read.data,
				people: personNames(householdOf(copy, "base")),
				warning: healthWarning(copy),
			},
		})
		expect(body.match(/data-primary-action/g)).toHaveLength(1)
		expect(body).toContain('aria-label="1 thing to check"')
		expect(body).toContain('href="/health/"')
	})
})

describe("ChanceGrid", () => {
	test("draws one square per market, the succeeded ones filled", () => {
		const { body } = render(ChanceGrid, { props: { counts: { succeeded: 193, paths: 200 } } })
		expect(body.match(/bg-accent/g)).toHaveLength(193)
		expect(body.match(/border-border/g)).toHaveLength(7)
	})
})

describe("FocusButtons", () => {
	test("draws one primary button and no chip without a warning", () => {
		const { body } = render(FocusButtons, {
			props: {
				button: { label: "See your plan", href: "/projection/", external: false },
				warning: null,
			},
		})
		expect(body.match(/data-primary-action/g)).toHaveLength(1)
		expect(body).not.toContain('href="/health/"')
	})
})

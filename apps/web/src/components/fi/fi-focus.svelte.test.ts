import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { outsideDetails } from "../../lib/view/details.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import FiSections from "./FiSections.svelte"

beforeEach(() => {
	setTestUrl("http://127.0.0.1/fi/?demo=1")
	replaceSnapshot(DEMO)
})
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

function body(): string {
	return render(FiSections, { props: { snapshot: DEMO } }).body
}

describe("the FI page's lead picture", () => {
	test("opens the first plan on the focus chart, with the answer written on it", () => {
		const page = body()
		expect(page.match(/data-focus-visual/g)).toHaveLength(1)
		expect(page.match(/data-focus-answer/g)).toHaveLength(1)
		expect(page).toContain("Oct 2040")
		expect(page).toContain("You could stop working in Oct 2040")
	})

	test("draws no answer for a second plan", () => {
		const page = body()
		const second = page.slice(page.indexOf(">joint</h2>"))
		expect(second).not.toContain("data-focus-answer")
		expect(second).not.toContain("data-focus-visual")
	})

	test("keeps the exact date and the ages in the page's hidden text", () => {
		const page = body()
		expect(page).toContain("The earliest month earned income could stop: 1 Oct 2040")
		expect(page).toContain("Ages on that date: You 50, Your partner 48, Child 14.")
	})

	test("states the rule of thumb as one quiet line, with the reference behind Details", () => {
		const page = body()
		const outside = outsideDetails(page)
		expect(outside).toContain("Rule of thumb:")
		expect(outside).toContain("(reference: 25×)")
		expect(outside).not.toContain("Not met")
	})
})

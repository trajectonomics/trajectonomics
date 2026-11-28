import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { preferences } from "../../client/preferences.svelte.js"
import { body, held, ITEMS } from "./section.test-support"

beforeAll(() => setTestUrl("http://127.0.0.1/projection/?scenario=base"))
afterAll(() => {
	setTestUrl("http://127.0.0.1/")
	preferences.hidden = false
})

describe("the Plan page's list of what a plan assumes", () => {
	test("draws nothing for an empty list, an older Snapshot or no plan", () => {
		for (const html of [body([]), body(undefined), body(ITEMS, null)]) {
			expect(html).not.toContain("<section")
		}
	})

	test("states each kind's sentence at the id Home's card links to", () => {
		const html = body(ITEMS)
		expect(html).toContain('id="assumed"')
		expect(html).toContain("This plan assumes")
		const text = html.replaceAll(/<[^>]*>/g, "").replaceAll(/\s+/g, " ")
		for (const sentence of [
			"Inflation is 0% a year",
			"grows at 1.5% a year",
			"charges 7% interest",
			"is an amount you did not set",
			"has no tax label",
			"Life insurance premiums is not in this plan's tax",
			"1 tax figure is not yet confirmed",
		]) {
			expect(text).toContain(sentence)
		}
	})

	test("links each kind to the page that changes it", () => {
		const html = body(ITEMS)
		for (const path of [
			"settings/assumptions",
			"assets-and-debts",
			"income",
			"settings/tax",
			"tax",
		]) {
			expect(html).toContain(`href="/${path}/?scenario=base"`)
		}
		expect(html).toContain(">See tax</a>")
	})

	test("names each item through the plan's names, and marks the CLI's note", () => {
		const html = body(ITEMS)
		expect(html).toContain('data-item="condo-rent"')
		expect(html).toContain(`data-item="${held.id}"`)
		expect(html).not.toContain(`>${held.id}<`)
		expect(html).not.toContain("lifeInsurance")
		expect(html).toMatch(/data-cli[^>]*>\s*Home-loan interest ceiling, baht\./)
	})

	test("masks an amount while amounts are hidden, and keeps the rest", () => {
		preferences.hidden = false
		expect(body(ITEMS)).toContain("52,000.00")
		preferences.hidden = true
		const html = body(ITEMS)
		expect(html).not.toContain("52,000")
		expect(html).not.toContain("52000")
		expect(html).toContain("amount hidden")
		expect(html).toContain("Inflation is 0% a year")
		preferences.hidden = false
	})
})

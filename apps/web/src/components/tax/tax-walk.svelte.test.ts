import { describe, expect, test } from "bun:test"
import { ok, projectionRun } from "../../lib/view/compare/projection.test-support"
import { plainYear, walkedYear } from "../../lib/view/tax/brackets.test-support"
import { panel } from "./tax-panel.test-support"

const NEXT = { from: "2027-01-01", to: "2027-12-31", settlementDate: "2028-03-31" }

function page(taxYears = [walkedYear(), walkedYear(NEXT)]): string {
	return panel({ base: ok(projectionRun({ taxYears })) })
}

describe("the Tax page when the CLI walked the tax", () => {
	test("shows the walk, the brackets with the top rate marked, and the room to the next rate", () => {
		const body = page()
		expect(body).toContain("From income to taxable income")
		expect(body).toContain("Your brackets")
		expect(body).toContain("Your top rate")
		expect(body).toContain("more taxable income before the next rate")
		expect(body).toContain("100,000.00")
	})

	test("names the two rates, each with a sentence", () => {
		const body = page()
		expect(body).toContain("Top rate")
		expect(body).toContain("Share of income paid in tax")
		expect(body).toContain("3.12%")
		expect(body).toContain("before expenses and allowances")
	})

	test("shows the CLI's note above the brackets", () => {
		const note = "The minimum tax applied: 6,000.00 (Section 48(2))."
		const body = page([walkedYear({ notes: [note] })])
		expect(body).toContain(note)
		expect(body.indexOf(note)).toBeLessThan(body.indexOf("Your top rate"))
	})

	test("links to the allowances page", () => {
		const body = page()
		expect(body).toContain("Lower it with allowances")
		expect(body).toContain('href="/optimize/allowances/"')
	})

	test("charts every year by bracket, labelled nominal, and tables each year's rates", () => {
		const body = page()
		expect(body).toContain('id="tax-bracket-chart-title"')
		expect(body).toContain("Nominal figures")
		expect(body).toContain("Share of income paid")
		expect(body).toContain("Income, tax and rates by tax year")
		expect(body).toContain(">1 Jan 2027 to 31 Dec 2027<")
	})

	test("leaves out the room to the next rate in the highest bracket", () => {
		const { toNextBracket: _room, ...top } = walkedYear()
		expect(page([top])).not.toContain("more taxable income before the next rate")
	})

	test("lays its figures out to wrap on a phone: two rates stack, and bars are a percent of the row", () => {
		const body = page()
		expect(body).toContain("sm:grid-cols-2")
		expect(body).toContain("width: 100%")
		expect(body).not.toMatch(/min-w-\[?\d/)
	})
})

describe("the Tax page for a hand-written Levy", () => {
	test("shows the page as it was, with no new section and no error", () => {
		const body = page([plainYear(), plainYear(NEXT)])
		for (const text of [
			"This tax year",
			"Your brackets",
			"Lower it with allowances",
			"Taxable income by bracket",
			"Income, tax and rates by tax year",
			"Not stated",
		]) {
			expect(body).not.toContain(text)
		}
		expect(body).toContain("Tax years, figures in THB")
		expect(body).not.toContain('role="alert"')
	})
})

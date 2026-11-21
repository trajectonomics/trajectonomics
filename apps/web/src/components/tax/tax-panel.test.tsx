import { describe, expect, test } from "bun:test"
import { failed, ok, projectionRun } from "../../lib/view/compare/projection.test-support"
import { panel, withLevy, year } from "./tax-panel.test-support"

describe("TaxPanel: the Scenario", () => {
	test("a Scenario with no Levy says so, that its figures are before tax, and gives the command", () => {
		const html = panel({ base: ok(projectionRun({ tax: "not_applied", taxYears: [] })) })
		expect(html).toContain("No Levy in this Scenario")
		expect(html).toContain("before tax")
		expect(html).toContain("traj scenario tax base --tax th-2026")
	})

	test("an unknown name says so and shows the first Scenario", () => {
		const html = panel({ base: ok(withLevy), "retire-early": ok(withLevy) }, "ghost")
		expect(html).toContain("There is no Scenario named ghost. Showing base.")
	})

	test("a failed Projection Read shows the CLI's message and keeps the picker", () => {
		const html = panel({ base: failed("The Scenario is empty.") })
		expect(html).toContain('role="alert"')
		expect(html).toContain("The Scenario is empty.")
		expect(html).toContain('name="scenario"')
	})
})

describe("TaxPanel: the tax years", () => {
	test("the headline says Owed for a positive figure", () => {
		const html = panel({ base: ok(withLevy) })
		expect(html).toContain(">Owed<")
		expect(html).toContain("89,000.00")
	})

	test("a negative owed is a refund, in words, with its sign kept", () => {
		const refund = year({ owed: "-12000.00", due: "0.00", prepaid: "12000.00" })
		const html = panel({ base: ok(projectionRun({ taxYears: [refund] })) })
		expect(html).toContain(">Refund<")
		expect(html).toContain("−12,000.00")
	})

	test("settled and partial marks come with their explanations in the CLI's words", () => {
		const late = year({
			from: "2060-01-01",
			to: "2060-12-31",
			settlementDate: "2061-03-31",
			settled: false,
			partial: true,
		})
		const html = panel({ base: ok(projectionRun({ taxYears: [year(), late] })) })
		expect(html).toContain("Settled</span>")
		expect(html).toContain("Partial</span>")
		expect(html).toContain(
			"the settlement date falls inside the Projection, so its charge is included.",
		)
		expect(html).toContain(
			"the Projection ended before the period did, so the period is incomplete.",
		)
	})
})

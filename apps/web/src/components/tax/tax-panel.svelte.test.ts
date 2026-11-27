import { describe, expect, test } from "bun:test"
import type { HouseholdDocument } from "../../lib/contract"
import { failed, ok, projectionRun } from "../../lib/view/compare/projection.test-support"
import { personNames } from "../../lib/view/item-names"
import { panel, withLevy, year } from "./tax-panel.test-support"

describe("TaxPanel: the plan", () => {
	test("a plan with no tax rules says so, that its figures are before tax, and gives the command", () => {
		const body = panel({ base: ok(projectionRun({ tax: "not_applied", taxYears: [] })) })
		expect(body).toContain("No tax rules in this plan")
		expect(body).toContain("before tax")
		expect(body).toContain("traj scenario tax base --tax th-2026")
	})

	test("an unknown name says so and shows the first plan", () => {
		const body = panel({ base: ok(withLevy), "retire-early": ok(withLevy) }, "ghost")
		expect(body).toContain("There is no plan named ghost. Showing base.")
	})

	test("a failed Projection Read shows the CLI's message and keeps the picker", () => {
		const body = panel({ base: failed("The Scenario is empty.") })
		expect(body).toContain('role="alert"')
		expect(body).toContain("The Scenario is empty.")
		expect(body).toContain('name="scenario"')
	})
})

describe("TaxPanel: the Returns of a separate filing", () => {
	const household: HouseholdDocument = {
		schemaVersion: 2,
		people: [
			{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
			{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
		],
		anchors: [],
		owners: [],
	}
	const separate = projectionRun({
		taxYears: [
			year({ levy: "th-2026-pit@me", filer: "me", due: "80000.00", owed: "80000.00" }),
			year({ levy: "th-2026-pit@partner", filer: "partner", due: "4600.00", owed: "4600.00" }),
		],
	})
	const people = { separate: personNames(household) }

	test("shows one Return at a time, with a switch named by person through the item-name lookup", () => {
		const body = panel({ separate: ok(separate) }, "separate", people)
		expect(body).toContain('name="return"')
		expect(body).toContain(">You<")
		expect(body).toContain(">Your partner<")
		expect(body).toContain("th-2026-pit@me")
		expect(body).toContain("80,000.00")
		expect(body).not.toContain("4,600.00")
	})

	test("a plan with one Return shows no switch", () => {
		const body = panel({ base: ok(withLevy) })
		expect(body).not.toContain('name="return"')
	})
})

describe("TaxPanel: the tax years", () => {
	test("the headline says Tax for a positive figure", () => {
		const body = panel({ base: ok(withLevy) })
		expect(body).toContain(">Tax<")
		expect(body).toContain("89,000.00")
	})

	test("a negative owed is a refund, in words, with its sign kept", () => {
		const refund = year({ owed: "-12000.00", due: "0.00", prepaid: "12000.00" })
		const body = panel({ base: ok(projectionRun({ taxYears: [refund] })) })
		expect(body).toContain(">Refund<")
		expect(body).toContain("−12,000.00")
	})

	test("settled and partial marks come with their explanations in the CLI's words", () => {
		const late = year({
			from: "2060-01-01",
			to: "2060-12-31",
			settlementDate: "2061-03-31",
			settled: false,
			partial: true,
		})
		const body = panel({ base: ok(projectionRun({ taxYears: [year(), late] })) })
		expect(body).toContain(">Settled<")
		expect(body).toContain(">Partial<")
		expect(body).toContain(
			"the settlement date falls inside the Projection, so its charge is included.",
		)
		expect(body).toContain(
			"the Projection ended before the period did, so the period is incomplete.",
		)
	})
})

describe("TaxPanel: the assumptions", () => {
	const gpf = {
		path: "allowances.retirementCluster.gpf.maxRate",
		value: 0.3,
		status: "reported" as const,
		note: "Government pension fund limit, share of wages.",
	}

	test("names each unconfirmed figure once, with its value and status", () => {
		const years = [year({ assumptions: [gpf] }), year({ from: "2027-01-01", assumptions: [gpf] })]
		const body = panel({ base: ok(projectionRun({ taxYears: years })) })
		expect(body).toContain("Assumptions")
		expect(body.split(gpf.path).length).toBe(2)
		expect(body).toContain("Used 0.3; reported.")
	})

	test("says nothing about assumptions when every figure used is confirmed", () => {
		expect(panel({ base: ok(withLevy) })).not.toContain("Assumptions")
	})
})

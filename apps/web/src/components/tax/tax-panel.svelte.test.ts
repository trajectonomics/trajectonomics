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

	test("keeps the plan picker when the chosen plan has no Read at all", () => {
		const body = panel({ base: ok(withLevy) }, "retire-early", {}, {}, {}, "", [
			"base",
			"retire-early",
		])
		expect(body).toContain("No Projection to read")
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

	test("names the recorded holder the earlier holder once the household has departed", () => {
		const gone: HouseholdDocument = {
			...household,
			people: [
				{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
				{ id: "bob", role: "partner", born: "1990-06", lifeExpectancy: 90 },
			],
		}
		const body = panel(
			{ separate: ok(separate) },
			"separate",
			{ separate: personNames(gone) },
			{ separate: "me" },
		)
		expect(body).toContain(">The earlier holder<")
		expect(body).toContain(">You<")
		expect(body).not.toContain(">me<")
		expect(body).not.toContain(">partner<")
	})

	test("names another departed id another person", () => {
		const renamed: HouseholdDocument = {
			...household,
			people: [
				{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
				{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
			],
		}
		const body = panel(
			{ separate: ok(separate) },
			"separate",
			{ separate: personNames(renamed) },
			{ separate: null },
		)
		expect(body).toContain(">You<")
		expect(body).toContain(">Another person<")
		expect(body).not.toContain(">partner<")
	})

	test("gives two departed Returns that would read alike their ids, apart", () => {
		const both: HouseholdDocument = {
			...household,
			people: [
				{ id: "ann", role: "holder", born: "1990-06", lifeExpectancy: 90 },
				{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
			],
		}
		const body = panel(
			{ separate: ok(separate) },
			"separate",
			{ separate: personNames(both) },
			{ separate: null },
		)
		expect(body).toContain(">Another person (me)<")
		expect(body).toContain(">Another person (partner)<")
	})

	test("shows the ids when there is no household at all", () => {
		const body = panel({ separate: ok(separate) }, "separate")
		expect(body).toMatch(/>me<\/span>/)
		expect(body).toMatch(/>partner<\/span>/)
		expect(body).not.toContain("Another person")
	})
})

describe("TaxPanel: the tax years", () => {
	test("a negative owed is a refund in the table's words, with its sign kept", () => {
		const refund = year({ owed: "-12000.00", due: "0.00", prepaid: "12000.00" })
		const body = panel({ base: ok(projectionRun({ taxYears: [refund] })) })
		expect(body).toContain(">Refund<")
		expect(body).toContain("−12,000.00")
		expect(body).toContain(">Owed<")
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

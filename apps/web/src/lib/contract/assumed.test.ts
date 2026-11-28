import { describe, expect, it } from "bun:test"
import { assumedItem } from "./assumed"
import { scenarioShow } from "./scenario-show"

/** A `scenario show` result of an untaxed plan, without the field an older Snapshot lacks. */
const BASE = {
	scenario: {
		id: "0194c000-0002-7000-8000-000000000002",
		name: "base",
		contentHash: "jcs1:sha256:abc",
		forkedFrom: null,
		version: 1,
		createdAt: "2026-01-31T10:00:00.000Z",
		updatedAt: "2026-01-31T10:00:00.000Z",
		document: { currency: "THB", flows: [], accounts: [] },
		household: null,
		householdHash: "jcs1:sha256:def",
		tax: null,
		taxed: false,
		notes: null,
		main: false,
	},
}

describe("the Assumed values a scenario show states", () => {
	it("decodes each of the four kinds", () => {
		const items = [
			{
				kind: "template-default",
				path: "economy.inflation",
				value: 0,
				hint: "Run",
			},
			{ kind: "unlabelled-income", path: "flows.bonus.label", value: null, hint: "Run" },
			{
				kind: "unstated-allowance",
				path: "taxAllowances.lifeInsurance",
				value: null,
				hint: "Run",
			},
			{
				kind: "tax-figure",
				path: "allowances.mortgageInterestCeiling",
				value: 100_000,
				status: "reported",
				note: "Home-loan interest ceiling, baht.",
				hint: null,
			},
		] as const
		for (const item of items) expect(assumedItem.parse(item)).toEqual(item)
	})

	it("decodes a show whose assumed field is absent, empty, or listed", () => {
		expect(scenarioShow.safeParse(BASE).success).toBe(true)
		expect(scenarioShow.safeParse({ scenario: { ...BASE.scenario, assumed: [] } }).success).toBe(
			true,
		)
		const one = {
			kind: "unlabelled-income",
			path: "flows.bonus.label",
			value: null,
			hint: "Run",
		} as const
		const parsed = scenarioShow.parse({ scenario: { ...BASE.scenario, assumed: [one] } })
		expect(parsed.scenario.assumed).toEqual([one])
	})

	it("refuses a kind the contract does not list", () => {
		const unknown = {
			kind: "run-rate",
			path: "flows.salary.amount",
			value: 0,
			hint: "Run",
		}
		expect(assumedItem.safeParse(unknown).success).toBe(false)
	})
})

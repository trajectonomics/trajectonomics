import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { planDocument } from "./fixtures.test-support"
import { newIncomeTaxNote } from "./tax-label"

const untaxed = (): ScenarioDocument => {
	const doc = planDocument()
	delete doc.levies
	return doc
}

describe("the notice a new income shows in a taxed plan", () => {
	test("names the plan's Tax labels page, safe whatever the plan is called", () => {
		expect(newIncomeTaxNote("base", planDocument(), "income", undefined)).toBe(
			"/settings/tax/?scenario=base",
		)
		expect(newIncomeTaxNote("a b&c", planDocument(), "income", undefined)).toBe(
			"/settings/tax/?scenario=a%20b%26c",
		)
	})

	test("is no notice for an edit, a plan without a Levy, or an expense", () => {
		const salary = planDocument().flows[0]
		expect(newIncomeTaxNote("base", planDocument(), "income", salary)).toBeNull()
		expect(newIncomeTaxNote("base", untaxed(), "income", undefined)).toBeNull()
		expect(newIncomeTaxNote("base", planDocument(), "expense", undefined)).toBeNull()
	})
})

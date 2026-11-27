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
	test("names the command that sets its label, with the plan's name and the id typed", () => {
		const note = newIncomeTaxNote("base", planDocument(), "income", undefined, "salary-2")
		expect(note?.command).toBe("traj scenario tax base --from-stored --label salary-2=<label>")
		expect(note?.before).toContain("only counts income it knows by its label")
	})

	test("leaves the id as a placeholder before the person types one", () => {
		const note = newIncomeTaxNote("base", planDocument(), "income", undefined, "")
		expect(note?.command).toContain("--label <flow>=<label>")
	})

	test("is no notice for an edit, a plan without a Levy, or an expense", () => {
		const salary = planDocument().flows[0]
		expect(newIncomeTaxNote("base", planDocument(), "income", salary, "salary")).toBeNull()
		expect(newIncomeTaxNote("base", untaxed(), "income", undefined, "salary-2")).toBeNull()
		expect(newIncomeTaxNote("base", planDocument(), "expense", undefined, "rent-2")).toBeNull()
	})
})

import { describe, expect, test } from "bun:test"
import { accountIds, flowIds, withAccount, withFlow, withoutAccount, withoutFlow } from "./document"
import { planDocument } from "./fixtures.test-support"
import { flowFromDraft } from "./flow-draft"
import { flowDraftOf } from "./flows"

describe("the document's items", () => {
	test("a Flow put in replaces the one of its id, and a new one is appended", () => {
		const doc = planDocument()
		const salary = doc.flows[0]
		if (salary === undefined) throw new Error("the fixture has a salary")
		const raised = { ...salary, amount: "95000.00" }
		const replaced = withFlow(doc, raised)
		expect(replaced.flows.map((flow) => flow.id)).toEqual(flowIds(doc))
		expect(replaced.flows[0]?.amount).toBe("95000.00")
		const added = withFlow(doc, { ...salary, id: "bonus" })
		expect(flowIds(added).at(-1)).toBe("bonus")
	})

	test("a Flow removed is gone, and every other section of the document is kept", () => {
		const doc = planDocument()
		const without = withoutFlow(doc, "rent")
		expect(flowIds(without)).not.toContain("rent")
		const { levies, cashflow, currency } = without
		const { levies: keptLevies, cashflow: keptCashflow } = doc
		expect({ levies, cashflow, currency }).toEqual({
			levies: keptLevies,
			cashflow: keptCashflow,
			currency: "THB",
		})
	})

	test("an Account put in and removed works the same way", () => {
		const doc = planDocument()
		const bank = doc.accounts[0]
		if (bank === undefined) throw new Error("the fixture has a bank")
		expect(accountIds(withAccount(doc, { ...bank, rate: 200 })).length).toBe(2)
		expect(accountIds(withoutAccount(doc, "bank"))).toEqual(["loan"])
	})

	test("a Flow saved from its form changes only that Flow in the document", () => {
		const doc = planDocument()
		const rent = doc.flows.find((flow) => flow.id === "rent")
		const result = flowFromDraft(
			{ ...flowDraftOf(rent), amount: "15,000" },
			{
				kind: "expense",
				existing: rent,
				taken: flowIds(doc),
			},
		)
		if (!result.ok) throw new Error("the change is valid")
		const next = withFlow(doc, result.flow)
		expect(next.flows.find((flow) => flow.id === "rent")?.amount).toBe("15000")
		expect(next.flows.filter((flow) => flow.id !== "rent")).toEqual(
			doc.flows.filter((flow) => flow.id !== "rent"),
		)
	})
})

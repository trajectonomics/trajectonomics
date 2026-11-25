import { describe, expect, test } from "bun:test"
import { planDocument } from "./fixtures.test-support"
import { flowFromDraft } from "./flow-draft"
import { type FlowDraft, flowDraftOf } from "./flows"

const blank: FlowDraft = {
	category: "",
	name: "",
	frequency: "monthly",
	start: "2027-01-01",
	end: "",
	amount: "1000",
	growth: "inflation",
	rate: "",
	earned: true,
}

describe("saving a Flow that changed nothing", () => {
	test("gives back the stored Flow, field for field, so the document is the same", () => {
		for (const flow of planDocument().flows) {
			if (flow.derive !== undefined) continue
			const result = flowFromDraft(flowDraftOf(flow), {
				kind: flow.kind === "expense" ? "expense" : "income",
				existing: flow,
				taken: [],
			})
			expect(result).toEqual({ ok: true, flow })
		}
	})
})

describe("a new Flow", () => {
	test("takes its id from its name, its amount without commas, and a fixed percent in basis points", () => {
		const result = flowFromDraft(
			{ ...blank, name: "Bonus 2027", amount: "1,000", growth: "fixed", rate: "3.5" },
			{ kind: "income", taken: ["salary"] },
		)
		expect(result).toEqual({
			ok: true,
			flow: {
				id: "bonus-2027",
				kind: "income",
				frequency: "monthly",
				start: "2027-01-01",
				amount: "1000",
				growth: { bps: 350 },
				earned: true,
			},
		})
	})

	test("numbers its id when another Flow already holds the name, and keeps passive income passive", () => {
		const result = flowFromDraft(
			{ ...blank, name: "salary", earned: false, end: "2028-12-31" },
			{ kind: "income", taken: ["salary"] },
		)
		expect(result.ok && result.flow.id).toBe("salary-2")
		expect(result.ok && result.flow.earned).toBe(false)
		expect(result.ok && result.flow.end).toBe("2028-12-31")
	})

	test("an expense has no earned field, and an empty end is left out", () => {
		const result = flowFromDraft({ ...blank, name: "Gym" }, { kind: "expense", taken: [] })
		expect(result.ok).toBe(true)
		expect(result.ok && "earned" in result.flow).toBe(false)
		expect(result.ok && "end" in result.flow).toBe(false)
	})

	test("refuses a missing name, an amount that is not a number, a bad date and a rate with three places", () => {
		const result = flowFromDraft(
			{ ...blank, name: " ", amount: "abc", start: "1 Jan", growth: "fixed", rate: "3.005" },
			{ kind: "income", taken: [] },
		)
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(Object.keys(result.problems).sort()).toEqual(["amount", "name", "rate", "start"])
		expect(result.problems["rate"]).toContain("two places")
	})

	test("an existing Flow's id is never renamed by the form, even when its name field is blank", () => {
		const salary = planDocument().flows[0]
		const result = flowFromDraft(
			{ ...blank, name: "" },
			{ kind: "income", existing: salary, taken: [] },
		)
		expect(result.ok && result.flow.id).toBe("salary")
	})
})

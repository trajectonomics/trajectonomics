import { describe, expect, it } from "bun:test"
import { checkPersona, loadPersonas, statedAmounts } from "./persona"

const personas = loadPersonas(`${import.meta.dir}/personas`)

describe("personas", () => {
	it("loads three fictional personas in name order", () => {
		expect(personas.map((persona) => persona.id)).toEqual([
			"nok-salaried-employee",
			"pim-krit-couple-mortgage",
			"ploy-freelancer-40-8",
		])
	})

	it("states every amount the oracle uses in the conversation, formatted the way a reader types it", () => {
		for (const persona of personas) {
			for (const amount of statedAmounts(persona)) {
				const formatted = amount.toLocaleString("en-US")
				expect(persona.conversation).toContain(formatted)
			}
		}
	})

	it("points the what-if at a flow the persona actually has", () => {
		for (const persona of personas) {
			expect(persona.flows.map((flow) => flow.id)).toContain(persona.whatIf.flowId)
		}
	})

	it("rejects an income flow that does not say whether it is earned", () => {
		const bad = {
			...personas[0],
			flows: [{ id: "x", kind: "income", monthlyBaht: 1, growth: "none" }],
		}
		expect(checkPersona(bad)).not.toBeNull()
	})

	it("rejects a contribution with no target", () => {
		const bad = {
			...personas[0],
			flows: [{ id: "x", kind: "contribution", monthlyBaht: 1, growth: "none" }],
		}
		expect(checkPersona(bad)).not.toBeNull()
	})
})

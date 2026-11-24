import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { incomeFlows, unlabelledIncome } from "./labels"
import { flowsSentence, taxShown } from "./refusal"

describe("income Flows without a tax label", () => {
	const flow = (id: string, kind: string, label?: string) => ({
		id,
		kind,
		frequency: "monthly",
		start: "2026-01-01",
		...(label === undefined ? {} : { label }),
	})
	const document = {
		currency: "THB",
		accounts: [],
		flows: [
			flow("salary", "income", "income.section40_1"),
			flow("condo-rent", "income"),
			flow("side", "income", ""),
			flow("food", "expense"),
			flow("rmf", "contribution"),
		],
	} as unknown as ScenarioDocument

	test("names the income Flows with none, and not an expense or a contribution", () => {
		expect(unlabelledIncome(document)).toEqual(["condo-rent", "side"])
		expect(unlabelledIncome({ ...document, flows: [] })).toEqual([])
		expect(incomeFlows(document)).toEqual(["salary", "condo-rent", "side"])
	})

	test("a document refusal that names Flows is a sentence naming them and where the labels are set", () => {
		const refusal = {
			code: "invalid_input",
			exitCode: 2,
			message:
				"With --tax, every income Flow needs a label from @trajectonomics/core/tax/th; 2 Flows have none",
			path: "document",
			details: { flows: ["condo-rent", "side"], labels: ["income.section40_1"] },
		}
		const sentence = flowsSentence(refusal)
		expect(sentence).toContain("condo-rent, side")
		expect(sentence).toContain("under Tax labels on this page")
		expect(sentence).not.toContain("@trajectonomics")
		expect(taxShown({}, refusal, refusal.message).general).toBe(flowsSentence(refusal) ?? "")
		expect(flowsSentence({ ...refusal, details: undefined })).toBeNull()
		expect(flowsSentence({ ...refusal, path: "--tax" })).toBeNull()
		expect(flowsSentence({ ...refusal, details: { flows: [1] } })).toBeNull()
	})
})

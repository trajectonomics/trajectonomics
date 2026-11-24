import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { incomeFlows, labelCommand, unlabelledIncome } from "./labels"
import { flowsSentence, taxShown } from "./refusal"

const PLAN = { name: "base", stored: true }

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

	test("the command keeps a stored profile with a merge, and states the whole one without", () => {
		expect(labelCommand("base", true)).toBe("traj scenario tax base --merge --label <flow>=<label>")
		expect(labelCommand("base", false)).toBe(
			"traj scenario tax base --tax th-2026 --label <flow>=<label>",
		)
	})

	test("a document refusal that names Flows is a sentence naming them and the command", () => {
		const refusal = {
			code: "invalid_input",
			exitCode: 2,
			message:
				"With --tax, every income Flow needs a label from @trajectonomics/core/tax/th; 2 Flows have none",
			path: "document",
			details: { flows: ["condo-rent", "side"], labels: ["income.section40_1"] },
		}
		const sentence = flowsSentence(refusal, { name: "base", stored: false })
		expect(sentence).toContain("condo-rent, side")
		expect(sentence).toContain("traj scenario tax base --tax th-2026 --label <flow>=<label>")
		expect(sentence).not.toContain("@trajectonomics")
		expect(taxShown({}, refusal, refusal.message, PLAN).general).toBe(
			flowsSentence(refusal, PLAN) ?? "",
		)
		expect(flowsSentence({ ...refusal, details: undefined }, PLAN)).toBeNull()
		expect(flowsSentence({ ...refusal, path: "--tax" }, PLAN)).toBeNull()
		expect(flowsSentence({ ...refusal, details: { flows: [1] } }, PLAN)).toBeNull()
	})
})

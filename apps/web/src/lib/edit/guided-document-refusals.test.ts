import { describe, expect, test } from "bun:test"
import { guidedDocument } from "./guided-document"
import { type GuidedEdit, type GuidedRows, guidedEditSchema } from "./guided-edit"

/** The decimal template the CLI prints at the As-of, with one income and one expense Flow. */
const TEMPLATE = JSON.stringify({
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [{ id: "bank", kind: "asset", rate: 0 }],
	flows: [
		{
			id: "salary",
			displayLabel: "Salary",
			kind: "income",
			earned: true,
			amount: "50000.00",
			frequency: "monthly",
			start: "2026-11-15",
			growth: "inflation",
		},
		{
			id: "food",
			displayLabel: "Food",
			kind: "expense",
			category: "Food",
			amount: "15000.00",
			frequency: "monthly",
			start: "2026-11-15",
			growth: "inflation",
		},
	],
	cashflow: { surplus: [{ account: "bank" }], contribute: ["bank"], withdraw: ["bank"] },
})

/** One history row, kept unless the test says otherwise. */
const row = (
	id: string,
	rest: Partial<Omit<GuidedRows[number], "id">> = {},
): GuidedRows[number] => ({
	id,
	keep: true,
	...rest,
})

/** A guided plan's answers, parsed, with the money the test states. */
function editOf(money: GuidedEdit["money"]): GuidedEdit {
	return guidedEditSchema.parse({
		kind: "start-guided-plan",
		name: "guided",
		asOf: "2026-11-15",
		money,
		people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
		stopWork: { person: "me", age: 60 },
	})
}

describe("the guided document's refusals", () => {
	test("two rows for one Flow are guided_ledger_changed, so neither answer wins silently", () => {
		const built = guidedDocument(
			TEMPLATE,
			editOf({
				from: "history",
				rows: [row("salary", { amount: "1" }), row("salary", { keep: false }), row("food")],
			}),
		)
		expect(built.ok).toBe(false)
		if (!built.ok) expect(built.error.code).toBe("guided_ledger_changed")
	})

	test("a template that is not the contract's document is contract_mismatch", () => {
		for (const template of ["not the document", JSON.stringify({ schemaVersion: 4 })]) {
			const built = guidedDocument(
				template,
				editOf({ from: "history", rows: [row("salary"), row("food")] }),
			)
			expect(built.ok).toBe(false)
			if (!built.ok) expect(built.error.code).toBe("contract_mismatch")
		}
	})

	test("a totals template with no salary or spending Flow is contract_mismatch", () => {
		const flows = (JSON.parse(TEMPLATE) as { flows: { id: string }[] }).flows
		for (const wrong of [
			flows.filter((flow) => flow.id !== "salary"),
			flows.filter((flow) => flow.id !== "food"),
		]) {
			const template = JSON.stringify({ ...JSON.parse(TEMPLATE), flows: wrong })
			const built = guidedDocument(
				template,
				editOf({ from: "totals", income: "40000", spending: "18000" }),
			)
			expect(built.ok).toBe(false)
			if (!built.ok) expect(built.error.code).toBe("contract_mismatch")
		}
	})
})

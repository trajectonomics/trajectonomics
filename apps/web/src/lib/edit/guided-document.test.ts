import { describe, expect, test } from "bun:test"
import { guidedDocument } from "./guided-document"
import {
	type GuidedEdit,
	type GuidedRows,
	guidedEditSchema,
	guidedHousehold,
	STOP_WORK_PATH,
} from "./guided-edit"

/** The decimal template the CLI prints at the As-of, with two income Flows and one expense. */
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

/** The built document, which a test expects to hold. */
function documentOf(money: GuidedEdit["money"]) {
	const built = guidedDocument(TEMPLATE, editOf(money))
	if (!built.ok) throw new Error(built.error.message)
	return built.document
}

const flowsOf = (money: GuidedEdit["money"]) => documentOf(money).flows
const flowOf = (money: GuidedEdit["money"], id: string) => {
	const flow = flowsOf(money).find((one) => one.id === id)
	if (flow === undefined) throw new Error(`no Flow ${id}`)
	return flow
}

describe("the guided document", () => {
	test("a dropped Flow is absent, and the kept ones stay in the template's order", () => {
		const flows = flowsOf({ from: "history", rows: [row("salary"), row("food", { keep: false })] })
		expect(flows.map((flow) => flow.id)).toEqual(["salary"])
	})

	test("a changed amount is kept exactly as it was typed", () => {
		const flow = flowOf(
			{ from: "history", rows: [row("salary", { amount: "52000.5" }), row("food")] },
			"salary",
		)
		expect(flow.amount).toBe("52000.5")
	})

	test("the earned flag is set from the row, and defaults to true", () => {
		const flows = flowsOf({
			from: "history",
			rows: [row("salary", { earned: false }), row("food")],
		})
		expect(flows.find((flow) => flow.id === "salary")?.earned).toBe(false)
	})

	test("endAt appears only on a kept income Flow whose earned is true", () => {
		const earned = flowsOf({
			from: "history",
			rows: [row("salary", { earned: true }), row("food")],
		})
		expect(earned.find((flow) => flow.id === "salary")?.endAt).toBe("stop-work")
		expect(earned.find((flow) => flow.id === "food")?.endAt).toBeUndefined()
		const unearned = flowsOf({
			from: "history",
			rows: [row("salary", { earned: false }), row("food")],
		})
		expect(unearned.find((flow) => flow.id === "salary")?.endAt).toBeUndefined()
	})

	test("the stop-work Milestone is appended, and its date is the As-of placeholder", () => {
		const document = documentOf({ from: "history", rows: [row("salary"), row("food")] })
		expect(document.milestones).toEqual([
			{
				id: "stop-work",
				displayLabel: "Stop work",
				combine: "all",
				criteria: [{ id: "age", kind: "date", on: "2026-11-15" }],
			},
		])
	})

	test("a row with no Flow, or a Flow with no row, is guided_ledger_changed", () => {
		const short = guidedDocument(TEMPLATE, editOf({ from: "history", rows: [row("salary")] }))
		expect(short.ok).toBe(false)
		if (!short.ok) {
			expect(short.error).toEqual({
				code: "guided_ledger_changed",
				exitCode: 2,
				message: "The ledger changed since this page read it. Reload and check your money again.",
			})
		}
		const extra = guidedDocument(
			TEMPLATE,
			editOf({ from: "history", rows: [row("salary"), row("food"), row("gone")] }),
		)
		expect(extra.ok).toBe(false)
		if (!extra.ok) expect(extra.error.code).toBe("guided_ledger_changed")
	})

	test("every row dropped is guided_no_flow", () => {
		const built = guidedDocument(
			TEMPLATE,
			editOf({
				from: "history",
				rows: [row("salary", { keep: false }), row("food", { keep: false })],
			}),
		)
		expect(built.ok).toBe(false)
		if (!built.ok) {
			expect(built.error).toEqual({
				code: "guided_no_flow",
				exitCode: 2,
				message: "Keep at least one income or spending row.",
			})
		}
	})

	test("the totals answers set the two zero Streams' amounts, and salary still ends at stop-work", () => {
		const totals = JSON.stringify({
			...JSON.parse(TEMPLATE),
			flows: [
				{
					id: "salary",
					kind: "income",
					earned: true,
					amount: "0.00",
					frequency: "monthly",
					start: "2026-11-15",
					growth: "inflation",
				},
				{
					id: "spending",
					kind: "expense",
					amount: "0.00",
					frequency: "monthly",
					start: "2026-11-15",
					growth: "inflation",
				},
			],
		})
		const built = guidedDocument(
			totals,
			editOf({ from: "totals", income: "40000", spending: "18000.50" }),
		)
		if (!built.ok) throw new Error(built.error.message)
		expect(built.document.flows.map(({ id, amount }) => ({ id, amount }))).toEqual([
			{ id: "salary", amount: "40000" },
			{ id: "spending", amount: "18000.50" },
		])
		expect(built.document.flows[0]?.endAt).toBe("stop-work")
		expect(built.document.flows[1]?.endAt).toBeUndefined()
	})

	test("the household pins the stop-work Milestone's age to the holder", () => {
		const household = guidedHousehold(
			editOf({ from: "history", rows: [row("salary"), row("food")] }),
		)
		expect(household.schemaVersion).toBe(1)
		expect(household.people).toHaveLength(1)
		expect(household.anchors).toEqual([{ path: STOP_WORK_PATH, person: "me", age: 60 }])
		expect(STOP_WORK_PATH).toBe("milestones.stop-work.criteria.age.on")
	})
})

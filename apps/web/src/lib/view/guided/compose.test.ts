import { describe, expect, test } from "bun:test"
import type { PersonDraft } from "../household/person-draft"
import { guidedEditOf } from "./compose"
import type { MoneyView } from "./money"
import { draftsOf, KEEP_PROBLEM, type RowDrafts } from "./money-draft"
import type { GuidedDraft } from "./steps"

const HOLDER: PersonDraft = {
	name: "me",
	displayLabel: "Me",
	role: "holder",
	relation: "",
	born: "1990-06",
	lifeExpectancy: "90",
	joins: "",
}

const MONEY: MoneyView = {
	path: "history",
	rows: [
		{
			id: "salary",
			name: "Salary",
			type: "income",
			frequency: "monthly",
			amount: "50000.00",
			monthsText: "12 of 12 months",
		},
		{
			id: "bonus",
			name: "Bonus",
			type: "income",
			frequency: "yearly",
			amount: "100000.00",
			monthsText: "12 of 12 months",
		},
		{
			id: "rent",
			name: "Rent",
			type: "expense",
			frequency: "monthly",
			amount: "15000.00",
			monthsText: "12 of 12 months",
		},
		{
			id: "food",
			name: "Food",
			type: "expense",
			frequency: "monthly",
			amount: "8000.00",
			monthsText: "12 of 12 months",
		},
	],
	leftOut: [],
	totals: { income: "50000.00", spending: "23000.00" },
}

const TOTALS: MoneyView = { ...MONEY, path: "totals", rows: [] }

/** The history answers: a kept and changed row, an unticked income row, a dropped row and one as stated. */
const ROWS: RowDrafts = {
	...draftsOf(MONEY.rows),
	salary: { keep: true, amount: "52,000", earned: true },
	bonus: { keep: true, amount: "", earned: false },
	rent: { keep: false, amount: "", earned: true },
}

/** The answers as one draft, on the history path unless a test says otherwise. */
function draft(over: Partial<GuidedDraft> = {}): GuidedDraft {
	return {
		money: MONEY,
		people: [HOLDER],
		rows: ROWS,
		totals: { income: "40000", spending: "18000.50" },
		name: "guided",
		age: "60",
		stored: ["base"],
		...over,
	}
}

describe("guidedEditOf", () => {
	test("builds the history Edit with every row, the typed amount and the earned answer", () => {
		const made = guidedEditOf(draft(), "2026-10-31")
		expect(made.ok && made.edit).toEqual({
			kind: "start-guided-plan",
			name: "guided",
			asOf: "2026-10-31",
			money: {
				from: "history",
				rows: [
					{ id: "salary", keep: true, amount: "52000", earned: true },
					{ id: "bonus", keep: true, earned: false },
					{ id: "rent", keep: false },
					{ id: "food", keep: true },
				],
			},
			people: [
				{ id: "me", displayLabel: "Me", born: "1990-06", lifeExpectancy: 90, role: "holder" },
			],
			stopWork: { person: "me", age: 60 },
		})
	})

	test("builds the totals Edit with the two typed totals, their commas off", () => {
		const made = guidedEditOf(
			draft({ money: TOTALS, totals: { income: "40,000", spending: "18000.50" } }),
			"2026-10-31",
		)
		expect(made.ok && made.edit.money).toEqual({
			from: "totals",
			income: "40000",
			spending: "18000.50",
		})
	})

	test("trims the plan name it sends", () => {
		const made = guidedEditOf(draft({ name: "  guided  " }), "2026-10-31")
		expect(made.ok && made.edit.name).toBe("guided")
	})

	test("sends no Edit while a problem holds a step", () => {
		const rows = Object.fromEntries(
			Object.entries(ROWS).map(([id, row]) => [id, { ...row, keep: false }]),
		)
		expect(guidedEditOf(draft({ rows }), "2026-10-31")).toEqual({
			ok: false,
			problem: KEEP_PROBLEM,
		})
	})
})

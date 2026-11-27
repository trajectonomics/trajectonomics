import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { MoneyView } from "../../lib/view/guided/money"
import { draftsOf } from "../../lib/view/guided/money-draft"
import MoneyRow from "./MoneyRow.svelte"
import MoneyStep from "./MoneyStep.svelte"
import TotalsStep from "./TotalsStep.svelte"

const SALARY = {
	id: "salary",
	name: "Salary",
	type: "income" as const,
	frequency: "monthly" as const,
	amount: "50000.00",
}

const MONEY: MoneyView = {
	path: "history",
	monthsCovered: 12,
	rows: [
		{ id: "rent", name: "Rent", type: "expense", frequency: "monthly", amount: "14000.00" },
		SALARY,
		{ id: "food", name: "Food", type: "expense", frequency: "monthly", amount: "8000.00" },
	],
	leftOut: [],
	totals: { income: "50000.00", spending: "22000.00" },
}

/** The money step of the fixture, with every row kept as the read stated it. */
function moneyStep(): string {
	return render(MoneyStep, {
		props: {
			money: MONEY,
			rows: draftsOf(MONEY.rows),
			showProblems: false,
			onRow: () => undefined,
		},
	}).body
}

beforeEach(() => {
	preferences.hidden = false
})
afterEach(() => {
	preferences.hidden = false
})

describe("the money step", () => {
	test("groups the rows under Income and Spending, income first, and says the coverage once", () => {
		const body = moneyStep()
		const income = body.indexOf(">Income</h3>")
		const spending = body.indexOf(">Spending</h3>")
		expect(income).toBeGreaterThan(-1)
		expect(income).toBeLessThan(spending)
		expect(body.indexOf("Untick income that continues after you stop")).toBeGreaterThan(income)
		expect(body.indexOf("Untick income that continues after you stop")).toBeLessThan(spending)
		expect(body).toContain("From 12 whole months of your ledger.")
		expect(body).not.toContain("12 of 12 months")
		expect(body.indexOf("From your ledger, per month")).toBeGreaterThan(spending)
	})

	test("names each checkbox with its row", () => {
		const body = moneyStep()
		expect(body).toContain('aria-label="Keep Salary"')
		expect(body).toContain('aria-label="Stops when I stop working: Salary"')
	})

	test("masks every amount when Hide amounts is on", () => {
		preferences.hidden = true
		const history = moneyStep()
		expect(history).toContain("•••••")
		expect(history).not.toContain("50,000.00")

		const totals = render(TotalsStep, {
			props: {
				totals: { income: "40000", spending: "18000.50" },
				showProblems: false,
				onTotal: () => undefined,
			},
		}).body
		expect(totals).toContain('value="•••••"')
		expect(totals).not.toContain("40000")
		expect(totals).not.toContain("18000.50")

		const row = render(MoneyRow, {
			props: {
				row: SALARY,
				draft: { keep: true, amount: "12500", earned: true },
				problem: null,
				showProblems: false,
				onKeep: () => undefined,
				onAmount: () => undefined,
				onEarned: () => undefined,
			},
		}).body
		expect(row).toContain('value="•••••"')
		expect(row).toContain('placeholder="•••••"')
		expect(row).not.toContain("12500")
		expect(row).not.toContain("50,000.00")
	})
})

import type { AssumedItem, ScenarioDocument } from "../../contract"
import { scenarioDocument } from "../../contract"

/** A plan with two held Accounts, two debts, an income and an expense. */
export const DOCUMENT: ScenarioDocument = scenarioDocument.parse({
	currency: "THB",
	accounts: [
		{ id: "cash", kind: "asset" },
		{ id: "fund", kind: "asset" },
		{ id: "car-loan", kind: "liability" },
		{ id: "card", kind: "liability" },
	].map((account) => ({ ...account, balance: "0.00", rate: 0, compounding: "monthly" })),
	flows: [
		{ id: "salary", kind: "income" },
		{ id: "rent", kind: "expense" },
	].map((flow) => ({ ...flow, amount: "1.00", frequency: "monthly", start: "2026-01-01" })),
})

export const filled = (path: string, value: number | string): AssumedItem => ({
	kind: "template-default",
	path,
	value,
	hint: "Run",
})

export const unlabelled = (id: string): AssumedItem => ({
	kind: "unlabelled-income",
	path: `flows.${id}.label`,
	value: null,
	hint: "Run",
})

export const allowance = (klass: string): AssumedItem => ({
	kind: "unstated-allowance",
	path: `taxAllowances.${klass}`,
	value: null,
	hint: "Run",
})

export const taxFigure = (path: string, note: string): AssumedItem => ({
	kind: "tax-figure",
	path,
	value: 100_000,
	status: "reported",
	note,
	hint: null,
})

/** One of every kind of item, one in each group, in the CLI's order. */
export const ONE_OF_EACH: readonly AssumedItem[] = [
	filled("economy.inflation", 0),
	filled("accounts.cash.rate", 150),
	filled("accounts.car-loan.rate", 700),
	filled("flows.salary.amount", "52000.00"),
	unlabelled("salary"),
	allowance("lifeInsurance"),
	taxFigure("allowances.mortgageInterestCeiling", "Home-loan interest ceiling, baht."),
]

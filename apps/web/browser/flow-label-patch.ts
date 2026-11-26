import {
	CYRILLIC,
	ENCLOSED,
	FAMILY,
	HOME_LOAN,
	INCOME_IDS,
	JAPANESE,
	JAPANESE_PUNCTUATION,
	NETFLIX,
	SAVING_IDS,
	SUBSCRIPTIONS,
	WIDE,
	WITHDRAWAL_IDS,
} from "./flow-label-cases"
import type { CashflowRow, ScenarioDocument, Year } from "./flow-label-snapshot"

/** Renames a Demo Flow and gives it a plan label, so the cash flow names it as the plan does. */
function renameFlow(document: ScenarioDocument, from: string, to: string, label: string): void {
	const flow = document.flows.find((one) => one.id === from)
	if (flow === undefined) throw new Error(`the Demo has no ${from} Flow`)
	flow.id = to
	flow.displayLabel = label
}

/** A row's Flow id, which a test's patch needs; a row that states none is a fault. */
function idOf(row: CashflowRow, group: string): string {
	if (row.id == null) throw new Error(`the Demo's ${group} row names no Flow`)
	return row.id
}

/** Renames a row's Flow and the row with it, so the diagram names the new id. */
function renameRow(
	document: ScenarioDocument,
	row: CashflowRow,
	group: string,
	to: string,
	label: string,
): void {
	renameFlow(document, idOf(row, group), to, label)
	row.id = to
}

/** Gives the three spending categories the review's capital labels, and adds a row for each other one. */
function patchCategories(year: Year): void {
	const categories = year.rows.filter((row) => row.group === "category")
	const [first, second, third] = categories
	if (first === undefined || second === undefined) {
		throw new Error("the Demo spends in two categories")
	}
	first.id = SUBSCRIPTIONS
	second.id = NETFLIX
	if (third !== undefined) third.id = HOME_LOAN
	const extras = [JAPANESE, JAPANESE_PUNCTUATION, CYRILLIC, ENCLOSED, WIDE, FAMILY]
	for (const id of extras) year.all.push({ ...first, id })
}

/** Makes the two income rows twins with long ids. */
function patchIncome(document: ScenarioDocument, year: Year): void {
	const [first, second] = year.rows.filter((row) => row.group === "income")
	if (first === undefined || second === undefined) throw new Error("the Demo earns two incomes")
	renameRow(document, first, "income", INCOME_IDS[0], "Consulting")
	renameRow(document, second, "income", INCOME_IDS[1], "Consulting")
}

/** Makes the first two saving rows twins with ids whose tails differ. */
function patchSaving(document: ScenarioDocument, year: Year): void {
	const [first, second] = year.rows.filter((row) => row.group === "contribution")
	if (first === undefined || second === undefined) throw new Error("the Demo saves twice")
	renameRow(document, first, "contribution", SAVING_IDS[0], "Saving")
	renameRow(document, second, "contribution", SAVING_IDS[1], "Saving")
}

/** Makes the withdrawal row twins with ids whose tails differ, and adds the second row. */
function patchWithdrawal(document: ScenarioDocument, year: Year): void {
	const row = year.rows.find((one) => one.group === "withdrawal")
	if (row === undefined) throw new Error("the Demo withdraws once")
	const id = idOf(row, "withdrawal")
	const source = document.flows.find((one) => one.id === id)
	if (source === undefined) throw new Error(`the Demo has no ${id} Flow`)
	renameRow(document, row, "withdrawal", WITHDRAWAL_IDS[0], "Withdraw")
	document.flows.push({ ...source, id: WITHDRAWAL_IDS[1], displayLabel: "Withdraw" })
	year.all.push({ ...row, id: WITHDRAWAL_IDS[1] })
}

/**
 * Puts the review's labels on Cash flow's bands: Japanese, wide Latin, a family emoji, Cyrillic capitals,
 * `ー`/`・` and `㈱` on spending categories; three capital labels that fit on `main`; and two income, two
 * saving and two withdrawal twins whose ids differ only near their end.
 */
export function patchFlowLabels(document: ScenarioDocument, year: Year): void {
	patchCategories(year)
	patchIncome(document, year)
	patchSaving(document, year)
	patchWithdrawal(document, year)
}

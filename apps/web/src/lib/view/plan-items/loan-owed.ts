/**
 * The debts "I already owe it" can attach a loan to: a liability the Baseline holds a balance in, which the
 * plan already declares or only the ledger knows. The balance is the Baseline's own text (web ADR 0002), and
 * the Account a loan attaches to is the one the Baseline names, so the loan's statement opens at that balance
 * (cli ADR 0059).
 */
import type { Baseline, Read, ScenarioDocument } from "../../contract"
import { loanPartsOf } from "./loan-document"
import type { Choice } from "./options"

/** One debt a loan may attach to: the id the Scenario spells it by, its ledger name and the Baseline's balance. */
export interface OwedChoice {
	readonly id: string
	readonly name: string
	readonly balance: string
	/** True when the plan declares the Account already; false when only the ledger holds it. */
	readonly declared: boolean
}

/**
 * The liabilities of the Baseline a loan may attach to, in the Baseline's order. A debt another loan of the plan
 * already repays is left out, except `keep`, the Account of the loan being edited. Empty when the Baseline
 * was not read or holds no debt.
 */
export function owedChoicesOf(
	doc: ScenarioDocument,
	baseline: Read<Baseline> | undefined,
	keep?: string,
): OwedChoice[] {
	if (baseline === undefined || !baseline.ok) return []
	const repaid = new Set(loanPartsOf(doc).map((loan) => loan.account.id))
	return baseline.data.rows.flatMap((row): OwedChoice[] => {
		if (row.kind !== "liability") return []
		const declared = doc.accounts.find(
			(account) => account.id === row.account.id || account.id === row.account.name,
		)
		if (declared !== undefined && declared.kind !== "liability") return []
		const id = declared?.id ?? row.account.id
		if (repaid.has(id) && id !== keep) return []
		return [{ id, name: row.account.name, balance: row.amount, declared: declared !== undefined }]
	})
}

/** The choice of the debt with that Scenario id, or undefined. */
export function owedChoiceOf(choices: readonly OwedChoice[], id: string): OwedChoice | undefined {
	return choices.find((choice) => choice.id === id)
}

/** The select's choices: none chosen first, then each debt by its ledger name. */
export function owedSelectChoices(choices: readonly OwedChoice[]): readonly Choice[] {
	return [
		{ value: "", label: "Choose the debt" },
		...choices.map((choice) => ({ value: choice.id, label: choice.name })),
	]
}

/**
 * Why "I already owe it" is unavailable, or null when a debt can be chosen. A loan saved as borrowed on a date
 * stays one when edited: the form names no debt for a loan that exists, so it could not save the change.
 */
export function owedUnavailable(
	choices: readonly OwedChoice[],
	editingDateLoan = false,
): string | null {
	if (editingDateLoan)
		return "this loan is borrowed on a date. To repay a debt the Baseline already holds, add a loan for that debt."
	return choices.length > 0
		? null
		: "The Baseline holds no debt that a loan does not already repay, so a loan can only be borrowed on a date."
}

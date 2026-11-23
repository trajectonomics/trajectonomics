/**
 * The shape checks of a loan form: each text that is not a shape `traj` may take is a problem at its field.
 * The CLI checks the rest (cli ADR 0059).
 */

import { parseBps } from "../../format/bps"
import { isDateText, slugId, typedAmount } from "./form"
import type { LoanDraft } from "./loan-draft"
import { type OwedChoice, owedChoiceOf } from "./loan-owed"

/** How often a loan's interest is added, which is also how often its payments fall. */
export const LOAN_COMPOUNDINGS = ["monthly", "quarterly", "annual"] as const

/** The roundings of a payment, in the order the schema lists them. */
export const LOAN_ROUNDINGS = ["floor", "halfUp", "ceil"] as const

/** The most payments a level loan may have (the schema's maximum). */
const MAX_PAYMENTS = 119976

/** Whether the text is a count of payments: digits only, from 1 to the schema's maximum. */
function isWholeCount(text: string): boolean {
	const trimmed = text.trim()
	if (!/^\d+$/.test(trimmed)) return false
	const count = Number(trimmed)
	return count >= 1 && count <= MAX_PAYMENTS
}

/** The problems of the fields that name the loan: its name, or the debt it repays when it is already owed. */
function identityProblems(
	draft: LoanDraft,
	options: { isNew: boolean; choices: readonly OwedChoice[]; keep?: string | undefined },
	problems: Map<string, string>,
): void {
	if (draft.arrival !== "owed") {
		if (options.isNew && slugId(draft.name) === "")
			problems.set("name", "Enter a name for the loan.")
		return
	}
	const known =
		draft.owedAccount === options.keep || owedChoiceOf(options.choices, draft.owedAccount)
	if (!known) {
		problems.set("owedAccount", "Choose the debt the Baseline holds, which the loan repays.")
	}
}

/** The problems a loan draft has at its fields: each text that is not a shape `traj` may take. */
export function problemsOf(
	draft: LoanDraft,
	options: { isNew: boolean; choices: readonly OwedChoice[]; keep?: string | undefined },
): Map<string, string> {
	const problems = new Map<string, string>()
	identityProblems(draft, options, problems)
	if (typedAmount(draft.principal) === null) {
		problems.set("principal", "Enter the amount borrowed as a decimal number, such as 500000.00.")
	}
	if (parseBps(draft.rate) === null) {
		problems.set("rate", "Enter a percent with at most two places, such as 6 or 6.25.")
	}
	if (!(LOAN_COMPOUNDINGS as readonly string[]).includes(draft.compounding)) {
		problems.set("compounding", "Choose how often the interest is added.")
	}
	if (!isWholeCount(draft.payments)) {
		problems.set(
			"payments",
			`Enter the number of payments, a whole number from 1 to ${MAX_PAYMENTS}.`,
		)
	}
	if (!isDateText(draft.firstPayment)) {
		problems.set("firstPayment", "Enter the first payment's date as YYYY-MM-DD.")
	}
	if (!(LOAN_ROUNDINGS as readonly string[]).includes(draft.rounding)) {
		problems.set("rounding", "Choose how each payment rounds to a minor unit.")
	}
	if (draft.arrival === "date" && !isDateText(draft.arrivalDate)) {
		problems.set("arrivalDate", "Enter the date the money arrives as YYYY-MM-DD.")
	}
	return problems
}

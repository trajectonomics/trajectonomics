/**
 * Tries a loan's changes in the What-if session: its Account and its payment are Sets of their fields. A
 * withdrawal that is added or taken out cannot be tried, so its label comes back for the form to name.
 */
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { LoanParts } from "../../lib/view/plan-items/loan-document"
import { recordOf } from "../../lib/what-if/session"

/** The fields the what-if could not try, by label: none when every change was tried. */
export function tryLoanInWhatIf(
	name: string,
	contentHash: string,
	stored: LoanParts,
	edited: LoanParts,
): string[] {
	const tried = [
		...whatIfSession.tryItem(
			name,
			contentHash,
			"accounts",
			stored.account.id,
			recordOf(stored.account),
			recordOf(edited.account),
		),
		...whatIfSession.tryItem(
			name,
			contentHash,
			"flows",
			stored.payment.id,
			recordOf(stored.payment),
			recordOf(edited.payment),
		),
	]
	return (stored.draw === null) !== (edited.draw === null) ? [...tried, "the money"] : tried
}

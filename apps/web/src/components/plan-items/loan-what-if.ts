/**
 * Tries a loan's changes in the What-if session: its Account, its payment and, when the money is borrowed on a
 * date, its withdrawal are Sets of their fields, so a changed principal or arrival date moves the draw with the
 * payment and the plan a Try saves is consistent. A withdrawal that is added or taken out cannot be tried, so
 * its label comes back for the form to name.
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
		...(stored.draw !== null && edited.draw !== null
			? whatIfSession.tryItem(
					name,
					contentHash,
					"flows",
					stored.draw.id,
					recordOf(stored.draw),
					recordOf(edited.draw),
				)
			: []),
	]
	return (stored.draw === null) !== (edited.draw === null) ? [...tried, "the money"] : tried
}

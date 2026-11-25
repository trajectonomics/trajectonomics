/**
 * Tries a loan's changes in the What-if session as one change: its Account, its payment and, when the money is
 * borrowed on a date, its withdrawal are Sets of their fields, so a changed principal or arrival date moves the draw
 * with the payment and the plan a Try saves is consistent. A withdrawal that is added or taken out cannot be tried, so
 * its label comes back for the form to name.
 */
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { GroupPart } from "../../client/what-if-groups.svelte.js"
import type { LoanParts } from "../../lib/view/plan-items/loan-document"
import { recordOf } from "../../lib/what-if/session"

/** The fields the what-if could not try, by label: none when every change was tried. */
export function tryLoanInWhatIf(
	name: string,
	contentHash: string,
	stored: LoanParts,
	edited: LoanParts,
): string[] {
	const part = (
		list: string,
		before: LoanParts[keyof LoanParts],
		after: typeof before,
	): GroupPart[] =>
		before === null || after === null
			? []
			: [{ list, id: before.id, stored: recordOf(before), edited: recordOf(after) }]
	const parts = [
		...part("accounts", stored.account, edited.account),
		...part("flows", stored.payment, edited.payment),
		...part("flows", stored.draw, edited.draw),
	]
	const spec = {
		kind: "loan",
		name: stored.account.id,
		paths: parts.map((one) => `${one.list}.${one.id}`),
	} as const
	const cleared = whatIfSession.tryGroup(name, contentHash, spec, parts)
	return (stored.draw === null) !== (edited.draw === null) ? [...cleared, "the money"] : cleared
}

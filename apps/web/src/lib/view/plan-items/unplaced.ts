/**
 * The items a loan card does not place on the Assets and debts page: the Flows that are not a loan's parts, and
 * the plain Accounts that are neither a debt a loan repays nor part of a real asset. Pure: data in, data out.
 */
import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import { groupedIds } from "./asset-document"
import { loanPartsOf } from "./loan-document"

/**
 * The loan Flows a loan card does not place: a withdrawal or a payment that is not one of a loan's parts. A
 * real asset's items are placed on its card, so they are not listed here.
 */
export function unplacedFlows(doc: ScenarioDocument): ScenarioFlow[] {
	const placed = new Set(
		loanPartsOf(doc).flatMap((loan) => [
			loan.payment.id,
			...(loan.draw === null ? [] : [loan.draw.id]),
		]),
	)
	const grouped = groupedIds(doc)
	return doc.flows.filter((flow) => !placed.has(flow.id) && !grouped.has(flow.id))
}

/** The Accounts a plain card shows: every Account except the debts a loan repays and the real assets, which have cards. */
export function plainAccounts(doc: ScenarioDocument): ScenarioDocument["accounts"] {
	const repaid = new Set(loanPartsOf(doc).map((loan) => loan.account.id))
	const grouped = groupedIds(doc)
	return doc.accounts.filter((account) => !repaid.has(account.id) && !grouped.has(account.id))
}

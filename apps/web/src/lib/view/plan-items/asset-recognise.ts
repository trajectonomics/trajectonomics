/**
 * The recognisers of a real asset's items (cli ADR 0060): each takes the shape the form writes and nothing else.
 * An item whose id follows the convention but whose shape differs is not recognised.
 */
import type { ScenarioDocument, ScenarioFlow } from "../../contract/scenario-show"
import type { AssetIds } from "./asset-ids"
import { isFixed, MONTHLY_DEN, ONCE_DEN, readsWholeValue, shareOf } from "./asset-shape"
import { type LoanParts, loanOf } from "./loan-document"

export type Pick = (id: string) => ScenarioFlow | undefined

/** The Flow of an id when it has the shape the check names, else null. */
export function shaped(
	pick: Pick,
	id: string,
	check: (flow: ScenarioFlow) => boolean,
): ScenarioFlow | null {
	const flow = pick(id)
	return flow !== undefined && check(flow) ? flow : null
}

/** The purchase: one obligation Contribution into the asset, paid in full on its date. */
export function purchaseOf(ids: AssetIds, pick: Pick): ScenarioFlow | null {
	return shaped(
		pick,
		ids.purchase,
		(f) =>
			f.kind === "contribution" &&
			f.target === ids.account &&
			f.funding === "obligation" &&
			f.frequency === "once" &&
			isFixed(f),
	)
}

/** A once expense on a date: a fixed amount, or `share` of the value when the check says so. */
export function onceCost(
	ids: AssetIds,
	pick: Pick,
	id: string,
	on: string | undefined,
	percent: boolean,
) {
	return shaped(pick, id, (f) => {
		if (f.kind !== "expense" || f.frequency !== "once" || on === undefined || f.start !== on) {
			return false
		}
		return percent ? shareOf(f, ids.account)?.den === ONCE_DEN : isFixed(f)
	})
}

/** A monthly Flow of the kind: a fixed amount, or a percent of the value a month (a twelfth of a yearly one). */
export function monthly(ids: AssetIds, pick: Pick, id: string, kind: "expense" | "income") {
	return shaped(pick, id, (f) => {
		if (f.kind !== kind || f.frequency !== "monthly") return false
		if (kind === "income" && f.earned !== false) return false
		return isFixed(f) || shareOf(f, ids.account)?.den === MONTHLY_DEN
	})
}

/** The sale: a withdrawal of the asset's whole value, once. */
export function saleOf(ids: AssetIds, pick: Pick): ScenarioFlow | null {
	return shaped(
		pick,
		ids.sale,
		(f) =>
			f.kind === "withdrawal" &&
			f.source === ids.account &&
			f.frequency === "once" &&
			readsWholeValue(f, ids.account),
	)
}

/** The loan: the three parts under the asset's ids, borrowed on the purchase date, with the amount the payments repay. */
export function loanOfAsset(
	doc: ScenarioDocument,
	ids: AssetIds,
	purchase: ScenarioFlow | null,
): LoanParts | null {
	const loan = loanOf(doc, ids.loan)
	const level = loan?.payment.level
	if (loan === undefined || purchase === null || loan.draw === null || level === undefined) {
		return null
	}
	const named = loan.payment.id === ids.loanPayment && loan.draw.id === ids.loanDraw
	const borrowed = loan.draw.start === purchase.start && loan.draw.amount === level.principal
	return named && borrowed ? loan : null
}

/** The payoff: a once Contribution into the loan that reads the asset's value, on the sale date. */
export function payoffOf(
	ids: AssetIds,
	pick: Pick,
	sale: ScenarioFlow | null,
): ScenarioFlow | null {
	return shaped(
		pick,
		ids.loanPayoff,
		(f) =>
			sale !== null &&
			f.kind === "contribution" &&
			f.target === ids.loan &&
			f.frequency === "once" &&
			f.start === sale.start &&
			readsWholeValue(f, ids.account),
	)
}

/** The groups of the values the template wrote (cli ADR-0084): inflation, the rates and the amounts. Pure. */
import type { AssumedItem, ScenarioDocument } from "../../contract"
import { amounts } from "./amounts"
import { inflation, rateGroup, ratesOf } from "./rates"
import type { AssumedGroup } from "./types"

/** The groups of the pre-filled values, in the page's order. An Account the document calls a liability is a debt. */
export function prefilledGroups(
	items: readonly AssumedItem[],
	document: ScenarioDocument,
	search: string,
): AssumedGroup[] {
	const prefilled = items.filter((item) => item.kind === "template-default")
	const debts = new Set(
		document.accounts.filter((one) => one.kind === "liability").map((one) => one.id),
	)
	const rates = ratesOf(prefilled)
	const owed = rates.filter((rate) => debts.has(rate.subject.id))
	const held = rates.filter((rate) => !debts.has(rate.subject.id))
	return [
		...inflation(prefilled, search),
		...rateGroup("account-rates", held, search),
		...rateGroup("debt-rates", owed, search),
		...amounts(prefilled, document, search),
	]
}

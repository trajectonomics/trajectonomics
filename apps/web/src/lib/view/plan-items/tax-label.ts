import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import { unlabelledIncome } from "../tax-settings/labels"
import type { FlowKind } from "./flows"

/** A Tax labels page a just-saved new income needs: the plan it belongs to, and the Flow. */
export interface TaxLabelOffer {
	plan: string
	flow: string
}

/**
 * Whether a new income Flow in a taxed plan needs a tax label. A Levy counts only the income whose label it knows, and
 * the form cannot set one, so a new income would be untaxed without a word.
 */
export function newIncomeNeedsTaxLabel(
	doc: ScenarioDocument,
	kind: FlowKind,
	existing: ScenarioFlow | undefined,
): boolean {
	return kind === "income" && existing === undefined && (doc.levies?.length ?? 0) > 0
}

/**
 * Whether a held offer still stands: the page shows that plan, and that income is still unlabelled. The page it links
 * to is built when the notice shows, so a switch made after the save is kept.
 */
export function heldTaxLabel(
	offer: TaxLabelOffer | null,
	plan: string,
	doc: ScenarioDocument,
): boolean {
	if (offer === null || offer.plan !== plan) return false
	return unlabelledIncome(doc).includes(offer.flow)
}

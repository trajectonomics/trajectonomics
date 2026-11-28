import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import { unlabelledIncome } from "../tax-settings/labels"
import type { FlowKind } from "./flows"

/** A Tax labels page a just-saved new income needs: the plan it belongs to, the Flow, and where it goes. */
export interface TaxLabelOffer {
	plan: string
	flow: string
	href: string
}

/**
 * Why a new income Flow in a taxed plan needs a tax label, or null when the form needs no notice. A Levy counts only the
 * income whose label it knows, and the form cannot set one, so a new income would be untaxed without a word. The value is
 * the Tax labels page for the plan, where the person gives the saved income its label.
 */
export function newIncomeTaxNote(
	plan: string,
	doc: ScenarioDocument,
	kind: FlowKind,
	existing: ScenarioFlow | undefined,
): string | null {
	if (kind !== "income" || existing !== undefined || (doc.levies?.length ?? 0) === 0) return null
	return `/settings/tax/?scenario=${encodeURIComponent(plan)}`
}

/**
 * The Tax labels page an offer still holds, or null when it no longer does: another plan is shown, or that income is
 * labelled now or gone.
 */
export function heldTaxLabelHref(
	offer: TaxLabelOffer | null,
	plan: string,
	doc: ScenarioDocument,
): string | null {
	if (offer === null || offer.plan !== plan) return null
	return unlabelledIncome(doc).includes(offer.flow) ? offer.href : null
}

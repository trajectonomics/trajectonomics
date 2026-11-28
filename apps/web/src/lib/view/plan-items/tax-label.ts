import type { ScenarioDocument, ScenarioFlow, Snapshot } from "../../contract"
import { unlabelledIncome } from "../tax-settings/labels"
import { isTaxed } from "../tax-settings/rows"
import type { FlowKind } from "./flows"

/** Where a save offered the Tax labels page: the guided save lands on Home, a drawer save stays on its items page. */
export type TaxLabelOrigin = "guided" | "drawer"

/** A Tax labels page a just-saved new income needs: the plan it belongs to, the Flow, and where it was offered. */
export interface TaxLabelOffer {
	plan: string
	flow: string
	origin: TaxLabelOrigin
	/** True when the plan stores a tax profile: an untaxed plan has no labels section yet, only its profile to set. */
	taxed: boolean
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

/** Whether the offer names this page: that plan, offered by a save of that kind. */
export function heldTaxLabelOffer(
	offer: TaxLabelOffer | null,
	plan: string,
	origin: TaxLabelOrigin,
): boolean {
	return offer !== null && offer.plan === plan && offer.origin === origin
}

/** The drawer's note: the income the save made still has no label. */
export function heldTaxLabel(
	offer: TaxLabelOffer | null,
	plan: string,
	origin: TaxLabelOrigin,
	doc: ScenarioDocument,
): boolean {
	if (offer === null || !heldTaxLabelOffer(offer, plan, origin)) return false
	return unlabelledIncome(doc).includes(offer.flow)
}

/** The next step: any income Flow of that plan still has no label. */
export function heldTaxStep(
	offer: TaxLabelOffer | null,
	plan: string,
	origin: TaxLabelOrigin,
	doc: ScenarioDocument,
): boolean {
	if (!heldTaxLabelOffer(offer, plan, origin)) return false
	return unlabelledIncome(doc).length > 0
}

/** The words of a notice's one sentence, split around the page it links to. */
export interface TaxLabelSentence {
	readonly lead: string
	readonly link: string
	readonly tail: string
}

/** The sentence a notice shows: its page as the link, and Next first on the page a guided save lands on. */
export function taxLabelSentence(next: boolean, untaxed: boolean): TaxLabelSentence {
	if (untaxed) return { lead: "Next: set up tax in ", link: "Tax profile", tail: "." }
	return next
		? { lead: "Next: give your income its tax labels in ", link: "Tax labels", tail: "." }
		: { lead: "Give this income a label in ", link: "Tax labels", tail: "." }
}

/** The first income of a plan in the Snapshot that has no tax label yet, or null when its document is not read. */
export function firstTaxLabelOffer(snapshot: Snapshot, plan: string): TaxLabelOffer | null {
	const read = snapshot.reads.documents[plan]
	if (read?.ok !== true) return null
	const show = read.data.scenario
	const [flow] = unlabelledIncome(show.document)
	return flow === undefined ? null : { plan, flow, origin: "guided", taxed: isTaxed(show) }
}

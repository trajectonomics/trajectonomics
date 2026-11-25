import { ThLevyContributionLabel } from "@trajectonomics/core/tax/th"
import type { ScenarioDocument } from "../document"
import { ALLOWANCE_FLAGS, type TaxAllowances } from "./allowances"
import { bareLabelOf } from "./filer-labels"
import type { ReturnClaims, TaxRequest } from "./flags"
import { records } from "./json"
import { flowsOf } from "./labels"
import { taxLeviesOf } from "./levy-ids"

/**
 * The deduction classes a `scenario tax` write can state, in the order the result lists them.
 * `personal` and `spouse` are not here: they follow the statute and the filing status, so there is
 * no flag a caller could leave out. `retirementContributions` and `thaiEsg` are not flags either:
 * they arrive as labelled contribution Flows, which the Levy tallies instead (ADR-0032).
 */
export const TAX_ALLOWANCE_CLASSES: readonly [
	"children",
	...(keyof TaxAllowances)[],
	"retirementContributions",
	"thaiEsg",
] = ["children", ...ALLOWANCE_FLAGS, "retirementContributions", "thaiEsg"]

export type TaxAllowanceClass = (typeof TAX_ALLOWANCE_CLASSES)[number]

/**
 * The classes the flags stated and the ones this build supports but the write left out. It is not
 * an eligibility claim: `@trajectonomics/core/tax` applies every statutory ceiling and eligibility rule
 * (a spouse life insurance premium stated by a single filer is read and clamped to zero), and the
 * CLI would have to reimplement those rules to say what the Levy applied (ADR-0036).
 */
export type TaxProfileView = {
	stated: TaxAllowanceClass[]
	notStated: TaxAllowanceClass[]
}

/** The contribution labels the CLI's Levies read, from their own tally measures. */
function fundedLabelsOf(document: ScenarioDocument): Set<string> {
	const labels = new Set<string>()
	for (const levy of taxLeviesOf(document)) {
		for (const measure of records(levy["measures"])) {
			if (measure["op"] === "tally" && measure["basis"] === "funded") {
				labels.add(String(measure["label"] ?? ""))
			}
		}
	}
	return labels
}

/** The labels the document's contribution Flows carry. */
function contributionLabelsOf(document: ScenarioDocument): Set<string> {
	const labels = new Set<string>()
	for (const flow of flowsOf(document)) {
		const label = flow["label"]
		if (flow["kind"] === "contribution" && typeof label === "string") labels.add(label)
	}
	return labels
}

/** The classes the flag-stated claims name, for every Return of the write. */
function statedClasses(claims: readonly ReturnClaims[]): Set<TaxAllowanceClass> {
	const stated = new Set<TaxAllowanceClass>()
	for (const claim of claims) {
		if (claim.children > 0) stated.add("children")
		for (const field of ALLOWANCE_FLAGS) {
			if (claim.allowances[field] > 0) stated.add(field)
		}
	}
	return stated
}

/** The classes the document's contribution Flows state, when a Levy reads their label. */
function contributionClasses(document: ScenarioDocument): Set<TaxAllowanceClass> {
	const read = fundedLabelsOf(document)
	const stated = new Set<TaxAllowanceClass>()
	for (const label of contributionLabelsOf(document)) {
		if (!read.has(label)) continue
		stated.add(
			bareLabelOf(label) === ThLevyContributionLabel.ThaiEsg
				? "thaiEsg"
				: "retirementContributions",
		)
	}
	return stated
}

/**
 * The allowance classes one written Levy states. A contribution class is stated only when the
 * Levy reads its label and a Flow carries it, which is read from the emitted graph rather than
 * restated here. A flag-stated amount is "stated" even where tax-core then clamps or, for an
 * ineligible filer, zeroes it: this reports what the write was told, never what it applied.
 */
export function taxProfileOf(request: TaxRequest, document: ScenarioDocument): TaxProfileView {
	const claims = [request, ...Object.values(request.returns ?? {})]
	const stated = new Set([...statedClasses(claims), ...contributionClasses(document)])
	return {
		stated: TAX_ALLOWANCE_CLASSES.filter((it) => stated.has(it)),
		notStated: TAX_ALLOWANCE_CLASSES.filter((it) => !stated.has(it)),
	}
}

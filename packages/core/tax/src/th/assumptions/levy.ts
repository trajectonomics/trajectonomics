import { ThLevyContributionLabel, ThLevyIncomeLabel } from "../levy/labels"
import { ThLevyMeasureId } from "../levy/measure-ids"
import { ThAssumptionFact as F, type ThAssumptionFact } from "./facts"
import { bareLabel, scaledIds } from "./levy-reads"
import { type ThAssumption, thAssumptions } from "./resolve"

/** The Measures of a Levy and, optionally, what each one came to in a period. */
export interface ThAssumptionLevy {
	readonly measures: readonly {
		readonly id: string
		readonly op: string
		readonly label?: string
		readonly of?: string
		readonly a?: string
		readonly b?: string
	}[]
}

/** A Measure's id and its value in one settlement period, in integer satang. */
export interface ThAssumptionMeasureValue {
	readonly id: string
	readonly value: number
}

const RATE_LABELS: Readonly<Record<string, ThAssumptionFact>> = {
	[ThLevyIncomeLabel.Section40_5Building]: F.Rate40_5Building,
	[ThLevyIncomeLabel.Section40_5AgriculturalLand]: F.Rate40_5AgriculturalLand,
	[ThLevyIncomeLabel.Section40_5NonAgriculturalLand]: F.Rate40_5NonAgriculturalLand,
	[ThLevyIncomeLabel.Section40_5Vehicles]: F.Rate40_5Vehicles,
	[ThLevyIncomeLabel.Section40_5Other]: F.Rate40_5Other,
	[ThLevyIncomeLabel.Section40_6Medical]: F.Rate40_6Medical,
	[ThLevyIncomeLabel.Section40_6Law]: F.Rate40_6Other,
	[ThLevyIncomeLabel.Section40_6Engineering]: F.Rate40_6Other,
	[ThLevyIncomeLabel.Section40_6Architecture]: F.Rate40_6Other,
	[ThLevyIncomeLabel.Section40_6Accounting]: F.Rate40_6Other,
	[ThLevyIncomeLabel.Section40_6FineArts]: F.Rate40_6Other,
	[ThLevyIncomeLabel.Section40_6Other]: F.Rate40_6Other,
	[ThLevyIncomeLabel.Section40_4DigitalAssets]: F.DigitalAssetFinal,
}

const CLAIM_LABELS: Readonly<Record<string, ThAssumptionFact>> = {
	[ThLevyContributionLabel.Rmf]: F.ClaimRmf,
	[ThLevyContributionLabel.Pvd]: F.ClaimPvd,
	[ThLevyContributionLabel.Gpf]: F.ClaimGpf,
	[ThLevyContributionLabel.Nsf]: F.ClaimNsf,
	[ThLevyContributionLabel.PensionLifeInsurance]: F.ClaimPensionLife,
	[ThLevyContributionLabel.ThaiEsg]: F.ClaimThaiEsg,
}

const CLAIM_MEASURES: Readonly<Record<string, ThAssumptionFact>> = {
	[ThLevyMeasureId.ClaimSocialSecurity]: F.ClaimSocialSecurity,
	[ThLevyMeasureId.ClaimLifeInsurance]: F.ClaimLifeInsurance,
	[ThLevyMeasureId.ClaimHealthInsurance]: F.ClaimHealthInsurance,
	[ThLevyMeasureId.ClaimParentHealthInsurance]: F.ClaimParentHealthInsurance,
	[ThLevyMeasureId.ClaimMortgageInterest]: F.ClaimMortgageInterest,
	[ThLevyMeasureId.ClaimDonation2x]: F.ClaimDonation2x,
}

function factsOf(
	levy: ThAssumptionLevy,
	isActive: (measure: { readonly id: string; readonly label?: string }) => boolean,
): ReadonlySet<ThAssumptionFact> {
	const scaled = scaledIds(levy.measures)
	const facts = new Set<ThAssumptionFact>()
	for (const measure of levy.measures) {
		const fact = factOfMeasure(measure, scaled)
		if (fact !== undefined && (measure.op !== "tally" || isActive(measure))) facts.add(fact)
	}
	return facts
}

function factOfMeasure(
	measure: ThAssumptionLevy["measures"][number],
	scaled: ReadonlySet<string | undefined>,
): ThAssumptionFact | undefined {
	if (measure.op === "const") return CLAIM_MEASURES[measure.id]
	if (measure.op !== "tally") return undefined
	const label = bareLabel(measure.label ?? "")
	const rate = RATE_LABELS[label]
	if (rate === undefined) return CLAIM_LABELS[label]
	return scaled.has(measure.id) ? rate : undefined
}

/**
 * Purpose: Lists the unconfirmed figures one settlement period of a Thai Levy relied on, read from
 * the Levy's own Measures and what its tallies came to, so a Projection can say what it assumed.
 * Math: A tally counts when its value is above zero; a rate label also needs its tally to feed a
 * `scale` Measure (the standard rate or the final withholding, not the actual-expense election);
 * a claim const counts when the Levy holds it.
 * Units: Measure values are integer satang; only their sign is read.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40(4)–(6), 47.
 */
export function thLevyAssumptions(
	levy: ThAssumptionLevy,
	values: readonly ThAssumptionMeasureValue[],
): readonly ThAssumption[] {
	const positive = new Set(
		values.filter((measure) => measure.value > 0).map((measure) => measure.id),
	)
	return thAssumptions(factsOf(levy, (measure) => positive.has(measure.id)))
}

/**
 * Purpose: Lists the unconfirmed figures a Thai Levy would rely on for Flows carrying `labels`,
 * for a caller that has the Levy and the labels but no period to evaluate.
 * Math: As {@link thLevyAssumptions}, with a tally counting when its label is in `labels`.
 * Units: None.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40(4)–(6), 47.
 */
export function thLevyAssumptionsForLabels(
	levy: ThAssumptionLevy,
	labels: ReadonlySet<string>,
): readonly ThAssumption[] {
	return thAssumptions(factsOf(levy, (measure) => labels.has(measure.label ?? "")))
}

import type { ThBreakdown, ThExpenseElectableIncome, ThTaxInput } from "../types"
import {
	ThFinalWithholdingElection,
	ThRealEstateExpenseBasis,
	ThSeparateSheetPaymentType,
} from "../types"
import { ThAssumptionFact as F, type ThAssumptionFact } from "./facts"

type ClaimKey =
	| "rmf"
	| "pvd"
	| "gpf"
	| "nsf"
	| "pensionLifeInsurance"
	| "thaiEsg"
	| "socialSecurity"
	| "lifeInsurance"
	| "healthInsurance"
	| "parentHealthInsurance"
	| "mortgageInterest"
	| "donation2x"
type Claim = readonly [ClaimKey, ThAssumptionFact]
type Item = number | ThExpenseElectableIncome | undefined

const CLAIMS: readonly Claim[] = [
	["rmf", F.ClaimRmf],
	["pvd", F.ClaimPvd],
	["gpf", F.ClaimGpf],
	["nsf", F.ClaimNsf],
	["pensionLifeInsurance", F.ClaimPensionLife],
	["thaiEsg", F.ClaimThaiEsg],
	["socialSecurity", F.ClaimSocialSecurity],
	["lifeInsurance", F.ClaimLifeInsurance],
	["healthInsurance", F.ClaimHealthInsurance],
	["parentHealthInsurance", F.ClaimParentHealthInsurance],
	["mortgageInterest", F.ClaimMortgageInterest],
	["donation2x", F.ClaimDonation2x],
]

function takesStandardRate(item: Item): boolean {
	if (item === undefined) return false
	if (typeof item === "number") return item > 0
	return item.amount > 0 && item.expenseElection !== "actual"
}

function rateFacts(input: ThTaxInput): readonly (readonly [Item, ThAssumptionFact])[] {
	const rental = input.income?.section40_5
	const profession = input.income?.section40_6
	return [
		[rental?.building, F.Rate40_5Building],
		[rental?.agriculturalLand, F.Rate40_5AgriculturalLand],
		[rental?.nonAgriculturalLand, F.Rate40_5NonAgriculturalLand],
		[rental?.vehicles, F.Rate40_5Vehicles],
		[rental?.other, F.Rate40_5Other],
		[profession?.medical, F.Rate40_6Medical],
		[profession?.law, F.Rate40_6Other],
		[profession?.engineering, F.Rate40_6Other],
		[profession?.architecture, F.Rate40_6Other],
		[profession?.accounting, F.Rate40_6Other],
		[profession?.fineArts, F.Rate40_6Other],
		[profession?.other, F.Rate40_6Other],
	]
}

function regimeFacts(breakdown: ThBreakdown): readonly ThAssumptionFact[] {
	const digital = breakdown.finalWithholding.digitalAssets
	const sheet = breakdown.separateSheet
	const transfer = breakdown.realEstate
	const isSeverance = sheet.paymentType === ThSeparateSheetPaymentType.Severance
	return [
		...(digital.election === ThFinalWithholdingElection.Final && digital.amount > 0
			? [F.DigitalAssetFinal]
			: []),
		...(sheet.amount > 0 ? [F.SeparateSheet] : []),
		...(sheet.amount > 0 && isSeverance ? [F.SeveranceExemption] : []),
		...(transfer.grossTransferValue > 0 &&
		transfer.expenseBasis === ThRealEstateExpenseBasis.HoldingPeriodTable
			? [F.RealEstateHoldingTable]
			: []),
	]
}

/**
 * Purpose: Reads what a calculation did, so the assumptions list names only the figures it used.
 * Math: A claim counts when its amount is above zero; a standard expense rate when the income is
 * above zero and the item did not elect actual expenses; a regime when its input was given.
 * Units: Amounts are baht major units; only their sign is read.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40(4)–(6), 47, 48(4)–(5).
 */
export function thFactsOfCalculation(
	input: ThTaxInput,
	breakdown: ThBreakdown,
): ReadonlySet<ThAssumptionFact> {
	const claimed = CLAIMS.filter(([key]) => (input.allowances?.[key] ?? 0) > 0)
	const rated = rateFacts(input).filter(([item]) => takesStandardRate(item))
	return new Set([
		...claimed.map(([, fact]) => fact),
		...rated.map(([, fact]) => fact),
		...regimeFacts(breakdown),
	])
}

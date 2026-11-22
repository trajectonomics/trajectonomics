import { toSatang } from "../units"
import type { ThLevyGraph } from "./graph"
import { ThLevyMeasureId } from "./measure-ids"
import type { ThLevyAllowances } from "./profile-types"

type ClaimedKey =
	| "socialSecurity"
	| "lifeInsurance"
	| "healthInsurance"
	| "parentHealthInsurance"
	| "mortgageInterest"
	| "donation2x"

const CLAIMED: readonly (readonly [ClaimedKey, ThLevyMeasureId])[] = [
	["socialSecurity", ThLevyMeasureId.ClaimSocialSecurity],
	["lifeInsurance", ThLevyMeasureId.ClaimLifeInsurance],
	["healthInsurance", ThLevyMeasureId.ClaimHealthInsurance],
	["parentHealthInsurance", ThLevyMeasureId.ClaimParentHealthInsurance],
	["mortgageInterest", ThLevyMeasureId.ClaimMortgageInterest],
	["donation2x", ThLevyMeasureId.ClaimDonation2x],
]

/**
 * Emits one audit const per stated allowance whose ceiling or multiplier is not yet sourced.
 *
 * Purpose: The fixed allowances are frozen into one const, so a report cannot tell which classes
 * the profile stated; these consts let a reader of the Levy name the unconfirmed figures it used.
 * Math: `const(satang)` for each stated amount above zero; no Measure reads them, so no tax figure
 * moves.
 * Units: THB major units in, integer satang out.
 * Throws: TaxValidationError if a stated amount is not valid satang.
 *
 * @param graph Measure graph being built.
 * @param allowances Fixed profile allowances.
 * @statute Thailand Revenue Code Section 47(1)(d)–(i), 47(7).
 */
export function addClaimMeasures(
	graph: ThLevyGraph,
	allowances: ThLevyAllowances | undefined,
): void {
	for (const [key, id] of CLAIMED) {
		const amount = allowances?.[key] ?? 0
		if (amount > 0) graph.constant(toSatang(amount), id)
	}
}

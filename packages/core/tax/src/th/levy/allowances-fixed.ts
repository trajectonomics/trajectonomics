import { calculateFamilyAllowances } from "../stages/allowances-family"
import { calculateInsuranceAllowances } from "../stages/allowances-insurance"
import type { ThFilingStatus } from "../types"
import { toSatang } from "../units"
import type { ThLevyGraph } from "./graph"
import { ThLevyMeasureId } from "./measure-ids"
import type { ThLevyAllowances } from "./profile-types"

/**
 * What a fixed allowance total includes.
 *
 * Purpose: Leaves the home-loan interest out when a shared loan is claimed per Settlement period.
 * Math: No arithmetic; a selection.
 * Units: Not monetary.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 47(1)(ซ).
 */
export interface ThFixedAllowanceOptions {
	/** Include the home-loan interest; false leaves it to the shared loan's per-period Measure. */
	readonly mortgageInterest?: boolean | undefined
}

/**
 * Computes the fixed allowance total frozen into the Levy.
 *
 * Purpose: Reuses the calculator's own family and insurance stages, so the const Measure cannot
 * drift from the rules it mirrors.
 * Math: Sum of the allowed personal, spouse, children, parents, disabled, social security,
 * life/health insurance, parent health, spouse life, and mortgage interest amounts.
 * Units: THB major units in, integer satang out.
 * Throws: TaxValidationError if any profile allowance amount is invalid.
 *
 * @param allowances Fixed profile allowances.
 * @param status Filing status governing spouse and parent eligibility.
 * @param options Which allowances the total includes; the mortgage interest is included by default.
 * @statute Thailand Revenue Code Section 47(1)(a)–(j), (ซ).
 */
export function fixedAllowanceSatang(
	allowances: ThLevyAllowances | undefined,
	status: ThFilingStatus,
	options: ThFixedAllowanceOptions = {},
): number {
	const family = calculateFamilyAllowances(allowances, status)
	const insurance = calculateInsuranceAllowances(allowances, status)
	const allowed = [
		family.personal.allowed,
		family.spouse.allowed,
		family.children.allowed,
		family.parents.allowed,
		family.disabled.allowed,
		insurance.socialSecurity.allowed,
		insurance.lifeInsurance.allowed,
		insurance.parentHealthInsurance.allowed,
		insurance.spouseLifeInsurance.allowed,
	]
	if (options.mortgageInterest !== false) allowed.push(insurance.mortgageInterest.allowed)
	return allowed.reduce((sum, value) => sum + toSatang(value), 0)
}

/**
 * Emits the Section 47 fixed allowance total as one const Measure.
 *
 * Purpose: Freezes the profile-only allowances into a single named Measure.
 * Math: `const(fixedAllowanceSatang(...))`.
 * Units: Integer satang.
 * Throws: TaxValidationError if a profile allowance amount is invalid.
 *
 * @param graph Measure graph being built.
 * @param allowances Fixed profile allowances.
 * @param status Filing status governing eligibility.
 * @param options Which allowances the total includes; the mortgage interest is included by default.
 * @statute Thailand Revenue Code Section 47(1)(a)–(j), (ซ).
 */
export function addFixedAllowances(
	graph: ThLevyGraph,
	allowances: ThLevyAllowances | undefined,
	status: ThFilingStatus,
	options?: ThFixedAllowanceOptions,
): string {
	return graph.constant(
		fixedAllowanceSatang(allowances, status, options),
		ThLevyMeasureId.AllowancesFixed,
	)
}

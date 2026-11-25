import { type ClampedAmount, clampCap } from "../../core/caps"
import { TaxValidationError, validateMonetaryAmount } from "../../core/money"
import { TH_2026_PARAMETERS } from "../parameters"
import {
	ThAllowanceField,
	type ThAllowancesInput,
	type ThChild,
	type ThChildrenInput,
	type ThFilingStatus,
	type ThParentsInput,
} from "../types"

export interface ThFamilyAllowancesResult {
	readonly personal: ClampedAmount
	readonly spouse: ClampedAmount
	readonly children: ClampedAmount
	readonly parents: ClampedAmount
	readonly disabled: ClampedAmount
}

const unclamped = (n: number): ClampedAmount => ({
	requested: n,
	allowed: n,
	cap: n,
	wasClamped: false,
})

function countBonusChildren(children: readonly ThChild[], cutoff: number): number {
	const sorted = [...children].sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0))
	let bonus = 0
	for (let i = 1; i < sorted.length; i++) {
		if ((sorted[i]?.birthYear ?? 0) >= cutoff) bonus++
	}
	return bonus
}

function computeChildAllowance(children: ThAllowancesInput["children"]): ClampedAmount {
	if (!children) return unclamped(0)
	const p = TH_2026_PARAMETERS.allowances.child
	if (Array.isArray(children)) {
		const bonus = countBonusChildren(children, p.bonusCutoffYear)
		return unclamped(children.length * p.basePerChild + bonus * p.bonusSecondPlusBorn2018OrLater)
	}
	const counts = children as ThChildrenInput
	validateMonetaryAmount(counts.totalCount ?? 0, ThAllowanceField.Children)
	const count = Math.max(0, Math.floor(counts.totalCount ?? 0))
	const bonusReq = Math.max(0, Math.floor(counts.secondPlusBorn2018OrLaterCount ?? 0))
	const bonus = Math.min(bonusReq, Math.max(0, count - 1))
	return unclamped(count * p.basePerChild + bonus * p.bonusSecondPlusBorn2018OrLater)
}

const countNamed = (...slots: (boolean | undefined)[]) => slots.filter(Boolean).length
const refusesSpouseSlots = (status: ThFilingStatus) => status.startsWith("married_separate")

/**
 * Counts the parents a Return claims from the object form of `parents`.
 *
 * Purpose: A joint Return names both spouses' parents (s.47(1)(ญ)); a separate Return names only
 * the Filer's own, so a spouse slot on it is refused instead of dropped (tax ADR 0010).
 * Math: One for each named slot the status admits; the count form is the number as given.
 * Units: Counts of persons.
 * Throws: TaxValidationError at `allowance.parents.spouse` for a spouse slot on a separate status.
 */
function computeParentCount(
	parents: ThParentsInput | number | undefined,
	status: ThFilingStatus,
): number {
	if (parents === undefined) return 0
	if (typeof parents === "number") {
		validateMonetaryAmount(parents, ThAllowanceField.Parents)
		return Math.floor(parents)
	}
	const own = countNamed(parents.taxpayerFather, parents.taxpayerMother)
	const spouse = countNamed(parents.spouseFather, parents.spouseMother)
	if (refusesSpouseSlots(status) && spouse > 0) {
		throw new TaxValidationError(
			ThAllowanceField.ParentsSpouseSlot,
			spouse,
			"A separate Return claims only the Filer's own parents",
		)
	}
	const claimsSpouse = status === "married_no_income_spouse" || status === "married_joint"
	return own + (claimsSpouse ? spouse : 0)
}

/**
 * Calculates family allowances (personal, spouse, children, parents, disabled).
 *
 * @statute Thailand Revenue Code Section 47(1)(a)–(f).
 */
export function calculateFamilyAllowances(
	input: ThAllowancesInput = {},
	filingStatus: ThFilingStatus = "single",
): ThFamilyAllowancesResult {
	const p = TH_2026_PARAMETERS.allowances
	const personalReq = input.personal ?? p.personal
	const personal = clampCap(personalReq, p.personal, ThAllowanceField.Personal)

	const isSpouseEligible =
		filingStatus === "married_no_income_spouse" || filingStatus === "married_joint"
	const spouseRequested = input.spouse ?? (isSpouseEligible ? p.spouse : 0)
	const spouse = isSpouseEligible
		? clampCap(spouseRequested, p.spouse, ThAllowanceField.Spouse)
		: {
				requested: spouseRequested,
				allowed: 0,
				cap: 0,
				wasClamped: spouseRequested > 0,
			}

	const children = computeChildAllowance(input.children)
	const parentCount = computeParentCount(input.parents, filingStatus)
	const parentsRequested = parentCount * p.parent.perPerson
	const parents = clampCap(
		parentsRequested,
		p.parent.perPerson * p.parent.maxCount,
		ThAllowanceField.Parents,
	)

	const disabledRequested = (input.disabledCareCount ?? 0) * p.disabledPerPerson
	validateMonetaryAmount(disabledRequested, ThAllowanceField.Disabled)
	const disabled = unclamped(disabledRequested)

	return { personal, spouse, children, parents, disabled }
}

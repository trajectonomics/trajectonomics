import { TaxValidationError, validateIntegerMinorUnits } from "../../core/money"
import { ThAllowanceField } from "../types"
import { toSatang } from "../units"
import { validateThFilers } from "./filers"
import type { ThLevyProfile, ThLevySharedMortgage } from "./profile-types"

/**
 * A shared home loan's amounts in integer satang, once the profile and the loan agree.
 *
 * Purpose: Carries the validated figures into the Measures, so the emit step converts each amount
 * exactly once and never adds two safe amounts into an unsafe one.
 * Math: The sum `own + total`, with `own` and `total` in satang.
 * Units: Integer satang.
 * Throws: Nothing; produced by {@link validateSharedMortgage}.
 * @statute Thailand Revenue Code Section 47(1)(ซ).
 */
export interface ThSharedMortgageSatang {
	/** This Return's own home-loan interest, in satang. */
	readonly own: number
	/** The whole interest on the shared loan, in satang. */
	readonly total: number
	/** `own + total`, in satang, which the one-earner rule caps with the ceiling. */
	readonly together: number
	/** The both-earners claim, in satang, which must not exceed `together`. */
	readonly claim: number
}

/**
 * Checks a shared loan against the Return that states it.
 *
 * Purpose: A `sharedMortgage` reads another Filer's income, so the Levy must be one separate
 * Return whose other Filer is someone else, and its both-earners claim must fit the loan it shares.
 * Math: Converts `own`, `total` and the claim to satang, requires `own + total` to be a safe
 * integer, and requires `claim <= own + total`.
 * Units: THB major units in, integer satang out.
 * Throws: TaxValidationError at {@link ThAllowanceField.MortgageInterest} for a status or Filer
 * count other than one `married_separate` Filer, an `other` equal to that Filer, an invalid
 * `other` id, a negative or unsafe amount, or a claim above `own + total`.
 *
 * @param profile The Return's profile.
 * @param shared The shared loan's other Filer, this Return's own interest and the whole interest.
 * @statute Thailand Revenue Code Section 47(1)(ซ).
 */
export function validateSharedMortgage(
	profile: ThLevyProfile,
	shared: ThLevySharedMortgage,
): ThSharedMortgageSatang {
	const field = ThAllowanceField.MortgageInterest
	const filers = profile.filers
	if (profile.filingStatus !== "married_separate" || filers?.length !== 1) {
		throw new TaxValidationError(
			field,
			profile.filingStatus,
			"A shared home loan needs one Return filed married_separate",
		)
	}
	validateThFilers([shared.other], "married_separate")
	if (shared.other === filers[0]) {
		throw new TaxValidationError(
			field,
			shared.other,
			"The other Filer must differ from this Return's Filer",
		)
	}
	const own = toSatang(shared.own, field)
	const total = toSatang(shared.total, field)
	const together = own + total
	validateIntegerMinorUnits(together, field)
	const claim = toSatang(profile.allowances?.mortgageInterest ?? 0, field)
	if (claim > together) {
		throw new TaxValidationError(
			field,
			profile.allowances?.mortgageInterest,
			"This Return's claim cannot exceed its own interest plus the shared loan",
		)
	}
	return { own, total, together, claim }
}

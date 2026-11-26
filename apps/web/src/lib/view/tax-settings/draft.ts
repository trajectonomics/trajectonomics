/**
 * The form's draft of a tax profile: every item is the text the person typed. A change to a stored profile sends only the
 * items that differ (`--merge`); a profile set whole sends what is filled and chooses the filing status, which has no default
 * here. `traj` parses and checks every value ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
 */
import type { TaxProfile } from "../../contract"
import { TAX_FLAG_KEYS } from "../../edit/tax-flags"

/** The draft: one text per item, the filing status "" until chosen. */
export type TaxDraft = Record<(typeof TAX_FLAG_KEYS)[number], string>

/** An empty draft: nothing is pre-filled for a plan with no stored profile. */
export function blankDraft(): TaxDraft {
	return Object.fromEntries(TAX_FLAG_KEYS.map((key) => [key, ""])) as TaxDraft
}

/** The draft of a stored profile, or an empty one: an absent key reads as empty. */
export function draftOf(profile: TaxProfile | null): TaxDraft {
	const draft = blankDraft()
	if (profile === null) return draft
	const stored = profile as Record<string, unknown>
	for (const key of TAX_FLAG_KEYS) draft[key] = stored[key] === undefined ? "" : String(stored[key])
	return draft
}

/**
 * The draft a whole write opens with: empty, except the stored shared home-loan interest the plan may claim, whatever
 * the profile's status, so a save that changes it to a separate filing keeps it rather than dropping it. The household
 * must name a partner and Owners, which is what `traj` reads `shared=` for; otherwise the value is not filled in.
 */
export function wholeDraftOf(profile: TaxProfile | null, sharedClaimable: boolean): TaxDraft {
	const draft = blankDraft()
	const stored = profile?.sharedMortgageInterest
	if (sharedClaimable && stored !== undefined) draft.sharedMortgageInterest = String(stored)
	return draft
}

/**
 * Whether the whole form's sentence about a filled-in shared interest applies: the field is offered on a separate
 * draft, and a stored value is there to keep. Another chosen status means the field is gone and a save drops it.
 */
export function keepsStoredShared(
	profile: TaxProfile | null,
	draft: TaxDraft,
	sharedClaimable: boolean,
): boolean {
	return (
		sharedClaimable &&
		draft.filingStatus === "married_separate" &&
		profile?.sharedMortgageInterest !== undefined
	)
}

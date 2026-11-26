/**
 * Whether the plan can claim a shared home-loan interest ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)):
 * `traj` reads `--mortgage-interest shared=` only on a separate filing whose household names a partner and
 * Owners, and writes one Levy per Filer (`th-2026-pit@<filer>`) only where a Return claims a share. Pure.
 */
import type { HouseholdDocument, ScenarioDocument, TaxProfile } from "../../contract"

/** A Levy's id, or undefined for an entry that is not an object with a string id. */
function levyId(levy: unknown): string | undefined {
	if (levy === null || typeof levy !== "object") return undefined
	const id = (levy as { id?: unknown }).id
	return typeof id === "string" ? id : undefined
}

/** Whether the household names a holder, a partner and Owners: the pair `traj` writes separate Returns for. */
export function canClaimShared(household: HouseholdDocument | null): boolean {
	if (household === null) return false
	const roles = new Set(household.people.map((person) => person.role))
	return roles.has("holder") && roles.has("partner") && (household.owners?.length ?? 0) > 0
}

/** The id of the tax Levy of one Filer's Return: `th-2026-pit@<filer>` (cli ADR-0075). Another Levy may carry an `@`. */
const FILER_TAX_LEVY = "th-2026-pit@"

/** Whether the stored profile files separately and one of the plan's tax Levies names a Filer, so a Return claims it. */
export function sharedInterestClaimed(profile: TaxProfile | null, plan: ScenarioDocument): boolean {
	if (profile?.filingStatus !== "married_separate") return false
	return (plan.levies ?? []).some((levy) => levyId(levy)?.startsWith(FILER_TAX_LEVY) === true)
}

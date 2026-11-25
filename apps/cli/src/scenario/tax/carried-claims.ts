import type { ScenarioDocument } from "../document"
import { zeroClaims } from "./claims-seed"
import type { ReturnClaims, TaxRequest } from "./flags"
import { filerOfTaxLevy, taxLevyIds } from "./levy-ids"

/**
 * The claims the written Levies carry: each Filer's of a separate Return and the interest on a loan
 * they borrowed together, otherwise the flat ones. A Return the profile only keeps for a later
 * separate filing is in no Levy.
 */
export function carriedClaims(request: TaxRequest, document: ScenarioDocument): ReturnClaims[] {
	const filers = taxLevyIds(document).flatMap((id) => filerOfTaxLevy(id) ?? [])
	if (filers.length === 0) return [request]
	const together = zeroClaims()
	together.allowances.mortgageInterest = request.sharedMortgageInterest ?? 0
	return [together, ...filers.map((filer) => request.returns?.[filer] ?? zeroClaims())]
}

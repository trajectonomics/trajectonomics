import { TH_2026_PARAMETERS } from "@trajectonomics/core/tax/th"
import type { ScenarioDocument } from "../document"
import { SHARED } from "../household/model"
import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { records } from "./json"

/*
 * A loan borrowed together shares one home-loan ceiling between two separate Returns, while each
 * person's own other loans count toward their own (tax ADR-0010). A liability has no kind and a
 * claim names no loan, so the CLI cannot tell which a Return's own interest is on: unless the caller
 * states the shared loan's interest as such, it takes the loans to be separate and says so in the
 * result (cli ADR-0075).
 */

const CEILING = TH_2026_PARAMETERS.allowances.mortgageInterestCeiling.toLocaleString("en-US")

/** What the ceiling's entry says when each Return's interest is taken to be on separate loans. */
export const SEPARATE_LOANS_NOTE: string = `Each separate Return's interest is taken to be on separate loans, each under its own ceiling; interest on one loan borrowed together shares a single ceiling between both Returns. If it is one loan borrowed together, state its interest as --mortgage-interest shared=<amount> instead, which splits it half to each Return under one ceiling of ${CEILING} baht.`

/**
 * Whether two Filers each state home-loan interest while the household says both own a loan, and no
 * interest is stated as that of a shared loan.
 */
export function assumesSeparateLoans(
	request: TaxRequest,
	scope: FilerScope | null,
	document: ScenarioDocument,
): boolean {
	if (scope?.kind !== "separate" || scope.filers.length < 2) return false
	if ((request.sharedMortgageInterest ?? 0) > 0) return false
	const claimed = scope.filers.every(
		(filer) => (request.returns?.[filer]?.allowances.mortgageInterest ?? 0) > 0,
	)
	return (
		claimed &&
		records(document["accounts"]).some(
			(account) =>
				account["kind"] === "liability" &&
				scope.ownerOf.get(`accounts.${String(account["id"])}`) === SHARED,
		)
	)
}

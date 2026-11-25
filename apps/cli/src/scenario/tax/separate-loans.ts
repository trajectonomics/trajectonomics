import { TH_2026_PARAMETERS } from "@trajectonomics/core/tax/th"
import type { AssumptionView } from "../../tax-assumptions"
import type { ScenarioDocument } from "../document"
import { SHARED } from "../household/model"
import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { records } from "./json"

/*
 * A loan borrowed together shares one home-loan ceiling between two separate Returns, while each
 * person's own other loans count toward their own (tax ADR-0010). A liability has no kind and a
 * claim names no loan, so the CLI cannot tell which the interest is on: it allows each Return its
 * own ceiling and says so in the result (cli ADR-0075).
 */

const PATH = "allowances.mortgageInterestCeiling"

const CEILING = TH_2026_PARAMETERS.allowances.mortgageInterestCeiling.toLocaleString("en-US")

const NOTE = `Each separate Return's interest is taken to be on separate loans, each under its own ceiling; interest on one loan borrowed together shares a single ceiling between both Returns. If it is one loan borrowed together, state each Return's share so the two total at most ${CEILING} baht.`

/** Whether two Filers each state home-loan interest while the household says both own a loan. */
export function assumesSeparateLoans(
	request: TaxRequest,
	scope: FilerScope | null,
	document: ScenarioDocument,
): boolean {
	if (scope?.kind !== "separate" || scope.filers.length < 2) return false
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

/**
 * The assumptions with that one said on tax-core's own entry for the ceiling, so each figure is still
 * named once and its status stays tax-core's. A write with interest on a Return has the entry while
 * tax-core calls the ceiling unconfirmed; the test of this note fails when it no longer does.
 */
export function withSeparateLoans(found: readonly AssumptionView[]): AssumptionView[] {
	return found.map((entry) =>
		entry.path === PATH ? { ...entry, note: `${entry.note} ${NOTE}` } : entry,
	)
}

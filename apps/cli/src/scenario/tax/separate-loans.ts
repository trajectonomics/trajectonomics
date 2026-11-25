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

const NOTE =
	"Each separate Return's interest is taken to be on separate loans, each under its own ceiling; interest on one loan borrowed together shares a single ceiling between both Returns."

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
 * The assumptions with that one said on the ceiling's entry, so each figure is still named once. The
 * entry is added if tax-core names the ceiling no longer, because the assumption outlives its source.
 */
export function withSeparateLoans(found: readonly AssumptionView[]): AssumptionView[] {
	if (found.some((entry) => entry.path === PATH)) {
		return found.map((entry) =>
			entry.path === PATH ? { ...entry, note: `${entry.note} ${NOTE}` } : entry,
		)
	}
	const value = TH_2026_PARAMETERS.allowances.mortgageInterestCeiling
	return [...found, { path: PATH, value, status: "unsourced", note: NOTE }]
}

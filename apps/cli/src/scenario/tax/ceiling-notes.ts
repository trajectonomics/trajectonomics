import {
	emitThLevy,
	TH_2026_PARAMETERS,
	thLevyAssumptionsForLabels,
} from "@trajectonomics/core/tax/th"
import { type AssumptionView, assumptionViews } from "../../tax-assumptions"
import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"

/*
 * What a write says on tax-core's assumption about the home-loan ceiling (cli ADR-0075): a sentence
 * about what the write assumed or left unclaimed goes on that entry, and its value and status stay
 * tax-core's. Claims under an id no longer in the household have their own entry (`departed-claims.ts`).
 */

const PATH = "allowances.mortgageInterestCeiling"

/** The sentence for shared interest the profile keeps while no separate Return claims it. */
function sharedUnclaimed(amount: number): string {
	return `${amount.toLocaleString("en-US")} baht of shared home-loan interest is stored for separate Returns, and this Return does not claim it. To state this Return's interest, use --mortgage-interest <amount> --merge; it replaces the stored mortgageInterest, which a later separate filing reads as one person's own, so state that again then.`
}

/** The sentence for the claims of other people the profile keeps while no separate Return is written. */
function claimsUnclaimed(persons: readonly string[]): string {
	const names = persons.map((person) => `"${person}"`).join(" and ")
	return `The claims stored for ${names} are kept for a separate filing, and this Return does not claim them.`
}

/**
 * What the profile a write keeps holds for a separate filing and its Return leaves out; nothing for a
 * separate Return with Filers. Under any other write every entry of `returns` is one that claims
 * something and is not the flat claims' person's (`keptRequest`). The `departed` ids are left to their
 * own entries, so no claim set is named twice.
 */
export function unclaimedNotes(
	kept: TaxRequest,
	scope: FilerScope | null,
	departed: readonly string[],
): string[] {
	if (scope?.kind === "separate") return []
	const shared = kept.sharedMortgageInterest ?? 0
	const persons = Object.keys(kept.returns ?? {}).filter((id) => !departed.includes(id))
	return [
		...(shared > 0 ? [sharedUnclaimed(shared)] : []),
		...(persons.length > 0 ? [claimsUnclaimed(persons)] : []),
	]
}

/** tax-core's own entry for the ceiling, read from a Levy that claims home-loan interest. */
function ceilingEntry(): AssumptionView[] {
	const mortgageInterest = TH_2026_PARAMETERS.allowances.mortgageInterestCeiling
	const claiming = emitThLevy({ allowances: { mortgageInterest } })
	const found = assumptionViews(thLevyAssumptionsForLabels(claiming, new Set()))
	return found.filter((entry) => entry.path === PATH)
}

/**
 * The assumptions with these sentences on the ceiling's entry, so each figure is still named once.
 * A Return that claims no home-loan interest lists no such entry, so it is added for them. Both come
 * from tax-core only while it calls the ceiling unconfirmed; the tests of these notes fail when it no
 * longer does.
 */
export function withCeilingNotes(
	found: readonly AssumptionView[],
	notes: readonly string[],
): AssumptionView[] {
	if (notes.length === 0) return [...found]
	const listed = found.some((entry) => entry.path === PATH)
	const all = listed ? found : [...found, ...ceilingEntry()]
	return all.map((entry) =>
		entry.path === PATH ? { ...entry, note: [entry.note, ...notes].join(" ") } : entry,
	)
}

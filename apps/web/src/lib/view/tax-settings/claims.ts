/**
 * Who claims each allowance when a plan files separately: one column per Filer, each cell the amount that Filer's
 * Return claims (cli ADR-0075). The holder's claims are the profile's flat keys, never its `returns` entry; every
 * other Return's claims are its `returns` entry. The page shows the stored claims and applies nothing. Pure.
 */
import type { Assumption, HouseholdDocument, ReturnClaims, TaxProfile } from "../../contract"
import { AMOUNT_FIELDS, COUNT_FIELDS, type TaxField } from "./fields"
import { groupDigits } from "./rows"

/** One allowance, with what each Return claims for it: the cells are in the same order as `people`. */
export interface ClaimRow {
	readonly key: string
	readonly label: string
	readonly cells: readonly string[]
}

/** The per-Return view of a separate filing: the Filers whose Return is a column, and one row per allowance. */
export interface ClaimsTable {
	readonly people: readonly string[]
	readonly rows: readonly ClaimRow[]
	/** The interest on one loan the Returns borrowed together, in baht, or null when the profile stores none. */
	readonly sharedInterest: string | null
}

/** The tax-core assumption path whose note says what the CLI assumes or leaves unclaimed about home-loan interest. */
const SHARED_CEILING = "allowances.mortgageInterestCeiling"

/** The words each of the CLI's own sentences on that path carries, so tax-core's bare ceiling note is not shown. */
const CLI_NOTE_MARKERS = ["separate loans", "does not claim"]

/** What one Return states for one allowance: a count as it is, an amount in baht, and "None" for zero or absent. */
function cellOf(claims: ReturnClaims | TaxProfile | undefined, field: TaxField): string {
	const value = claims?.[field.key]
	if (value === undefined || value === 0) return "None"
	return field.kind === "count" ? String(value) : `${groupDigits(value)} THB`
}

/** The person whose claims the flat keys are: the recorded `claimsHolder`, else the household's holder, else a Filer. */
function holderOf(
	profile: TaxProfile,
	household: HouseholdDocument | null,
	filers: readonly string[],
): string | undefined {
	const holder = household?.people.find((person) => person.role === "holder")
	return profile.claimsHolder ?? holder?.id ?? filers[0]
}

/**
 * The per-Return claims of a separate filing, or null for a plan whose projection names no Filer (a joint or single
 * filing, or a separate profile with no Filers): only a Filer's Levy reads a Return's claims.
 */
export function claimsTable(
	profile: TaxProfile,
	household: HouseholdDocument | null,
	filers: readonly string[],
): ClaimsTable | null {
	if (profile.filingStatus !== "married_separate" || filers.length === 0) return null
	const holder = holderOf(profile, household, filers)
	const claimsOf = (person: string): ReturnClaims | TaxProfile | undefined =>
		person === holder ? profile : profile.returns?.[person]
	return {
		people: [...filers],
		rows: [...COUNT_FIELDS, ...AMOUNT_FIELDS].map((field) => ({
			key: field.key,
			label: field.label,
			cells: filers.map((person) => cellOf(claimsOf(person), field)),
		})),
		sharedInterest:
			profile.sharedMortgageInterest === undefined
				? null
				: `${groupDigits(profile.sharedMortgageInterest)} THB`,
	}
}

/**
 * The CLI's own notes on home-loan interest, each once, in its order (cli ADR-0075, #606): the separate-loans
 * assumption, and the sentence that says a Return does not claim stored shared interest or another's claims.
 * Tax-core's generic ceiling note alone is neither, and is left out.
 */
export function sharedLiabilityNotes(
	years: readonly { readonly assumptions: readonly Assumption[] }[],
): readonly string[] {
	const notes = years.flatMap((year) =>
		year.assumptions
			.filter((one) => one.path === SHARED_CEILING)
			.map((one) => one.note)
			.filter((note) => CLI_NOTE_MARKERS.some((marker) => note.includes(marker))),
	)
	return [...new Set(notes)]
}

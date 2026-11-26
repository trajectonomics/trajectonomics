/**
 * Who claims each allowance when a plan files separately: one column per Filer, each cell the amount that Filer's
 * Return claims (cli ADR-0075). The holder's claims are the profile's flat keys, never its `returns` entry; every
 * other Return's claims are its `returns` entry. The page shows the stored claims and applies nothing. Pure.
 */
import type { HouseholdDocument, ReturnClaims, TaxProfile } from "../../contract"
import type { PersonName, PersonNames } from "../item-names"
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

/** One item a Return claims: the shared loan's interest is not a Return's own claim. */
type ClaimField = TaxField & {
	readonly key: Exclude<TaxField["key"], "sharedMortgageInterest">
}

/** The items a Return claims, in the page's order. */
const CLAIM_FIELDS: readonly ClaimField[] = [...COUNT_FIELDS, ...AMOUNT_FIELDS].filter(
	(field): field is ClaimField => field.key !== "sharedMortgageInterest",
)

/** What one Return states for one allowance: a count as it is, an amount in baht, and "None" for zero or absent. */
function cellOf(claims: ReturnClaims | TaxProfile | undefined, field: ClaimField): string {
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
		rows: CLAIM_FIELDS.map((field) => ({
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
 * The person whose claims the profile's flat keys are, when a holder swap left them recorded for the other person: the
 * cards then name them instead of saying "you". Null while the flat keys are the household's holder's own.
 */
export function flatClaimant(
	profile: TaxProfile,
	household: HouseholdDocument | null,
	people: PersonNames,
): PersonName | null {
	const recorded = profile.claimsHolder
	const holder = household?.people.find((person) => person.role === "holder")?.id
	if (recorded === undefined || recorded === holder) return null
	return people.get(recorded) ?? { label: recorded, subject: recorded }
}

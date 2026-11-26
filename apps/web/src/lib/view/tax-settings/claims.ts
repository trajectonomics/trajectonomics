/**
 * Who claims each allowance when a plan files separately: one column per Filer, each cell the amount that Filer's
 * Return claims (cli ADR-0075). The holder's claims are the profile's flat keys, never its `returns` entry; every
 * other Return's claims are its `returns` entry. The page shows the stored claims and applies nothing. Pure.
 */
import type { HouseholdDocument, ReturnClaims, TaxProfile } from "../../contract"
import { AMOUNT_FIELDS, COUNT_FIELDS, type TaxField } from "./fields"
import { groupDigits, type ShownAmount } from "./rows"

/** One cell: what a Return claims, and the amount's digits for the hide-amounts mask when it is money. */
export interface ClaimCell {
	readonly value: string
	readonly amount?: ShownAmount | undefined
}

/** One allowance, with what each Return claims for it: the cells are in the same order as `people`. */
export interface ClaimRow {
	readonly key: string
	readonly label: string
	readonly cells: readonly ClaimCell[]
}

/** The per-Return view of a separate filing: the Filers whose Return is a column, and one row per allowance. */
export interface ClaimsTable {
	readonly people: readonly string[]
	readonly rows: readonly ClaimRow[]
	/** The interest on one loan the Returns borrowed together, in baht, or null when the profile stores none. */
	readonly sharedInterest: ClaimCell | null
}

/** One item a Return claims: the shared loan's interest is not a Return's own claim. */
type ClaimField = TaxField & {
	readonly key: Exclude<TaxField["key"], "sharedMortgageInterest">
}

/** The items a Return claims, in the page's order. */
const CLAIM_FIELDS: readonly ClaimField[] = [...COUNT_FIELDS, ...AMOUNT_FIELDS].filter(
	(field): field is ClaimField => field.key !== "sharedMortgageInterest",
)

/** The table's own row words, neutral because each column is one person's Return: a "you" row would show another's figure. */
const CLAIM_ROW_LABELS: Readonly<Partial<Record<ClaimField["key"], string>>> = {
	parents: "Parents supported",
	disabledCare: "Relatives with a disability cared for",
	healthInsurance: "Health insurance premiums",
	parentHealthInsurance: "Health insurance premiums for parents",
}

/** An amount in baht, with the digits Hide amounts masks and the currency after them. */
function moneyCell(amount: number): ClaimCell {
	const digits = groupDigits(amount)
	return { value: `${digits} THB`, amount: { digits, after: " THB" } }
}

/**
 * The profile items whose bare value names the household's holder rather than a person: every claim but the shared
 * interest, which is sent as `shared=`. A holder swap leaves these on the earlier holder until `--from-stored` runs.
 */
export const FLAT_CLAIM_KEYS: readonly string[] = CLAIM_FIELDS.map((field) => field.key)

/** Whether a profile item is a flat claim, whose bare value a swapped holder would write to the new holder. */
export function isFlatClaim(key: string): boolean {
	return FLAT_CLAIM_KEYS.includes(key)
}

/** What one Return states for one allowance: a count as it is, an amount in baht, and "None" for zero or absent. */
function cellOf(claims: ReturnClaims | TaxProfile | undefined, field: ClaimField): ClaimCell {
	const value = claims?.[field.key]
	if (value === undefined || value === 0) return { value: "None" }
	return field.kind === "count" ? { value: String(value) } : moneyCell(value)
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
			label: CLAIM_ROW_LABELS[field.key] ?? field.label,
			cells: filers.map((person) => cellOf(claimsOf(person), field)),
		})),
		sharedInterest:
			profile.sharedMortgageInterest === undefined
				? null
				: moneyCell(profile.sharedMortgageInterest),
	}
}

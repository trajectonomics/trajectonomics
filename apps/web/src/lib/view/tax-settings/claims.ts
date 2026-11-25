/**
 * Who claims each allowance when a plan files separately: one column per Return, each cell the amount that Return's
 * profile states (cli ADR-0075). The page shows the stored claims and applies nothing; a claim `traj` does not hold
 * reads "Not stated". Pure.
 */
import type { Assumption, ReturnClaims, TaxProfile } from "../../contract"
import { AMOUNT_FIELDS, COUNT_FIELDS, type TaxField } from "./fields"
import { groupDigits } from "./rows"

/** One allowance, with what each Return claims for it: the cells are in the same order as `people`. */
export interface ClaimRow {
	readonly key: string
	readonly label: string
	readonly cells: readonly string[]
}

/** The per-Return view of a separate filing: the people whose Return is a column, and one row per allowance. */
export interface ClaimsTable {
	readonly people: readonly string[]
	readonly rows: readonly ClaimRow[]
}

/** The tax-core assumption path whose note says a shared home loan shares one ceiling between both Returns. */
const SHARED_CEILING = "allowances.mortgageInterestCeiling"

/** What one Return states for one allowance: a count as it is, an amount in baht, and "None" for zero or absent. */
function cellOf(claims: ReturnClaims | undefined, field: TaxField): string {
	const value = (claims as Record<string, number | undefined> | undefined)?.[field.key]
	if (value === undefined || value === 0) return "None"
	return field.kind === "count" ? String(value) : `${groupDigits(value)} THB`
}

/** The columns: the household's people first, in its order, then anyone else whose Return the profile still keeps. */
function peopleOf(
	returns: Readonly<Record<string, ReturnClaims>>,
	people: readonly string[],
): string[] {
	const named = people.filter((person) => Object.hasOwn(returns, person))
	return [...named, ...Object.keys(returns).filter((person) => !named.includes(person))]
}

/**
 * The per-Return claims of a separate filing, or null for a joint or single one: only `married_separate` writes
 * `returns` for a Levy to read, and another status may hold a person's claims no Levy reads.
 */
export function claimsTable(profile: TaxProfile, people: readonly string[]): ClaimsTable | null {
	const returns = profile.returns
	if (profile.filingStatus !== "married_separate" || returns === undefined) return null
	const columns = peopleOf(returns, people)
	return {
		people: columns,
		rows: [...COUNT_FIELDS, ...AMOUNT_FIELDS].map((field) => ({
			key: field.key,
			label: field.label,
			cells: columns.map((person) => cellOf(returns[person], field)),
		})),
	}
}

/**
 * The CLI's notes on a home loan two separate Returns share a ceiling for, each once, in its order (cli ADR-0075).
 * They come from the projection's tax years, so a plan whose Returns state no home-loan interest has none.
 */
export function sharedLiabilityNotes(
	years: readonly { readonly assumptions: readonly Assumption[] }[],
): readonly string[] {
	const notes = years.flatMap((year) =>
		year.assumptions.filter((one) => one.path === SHARED_CEILING).map((one) => one.note),
	)
	return [...new Set(notes)]
}

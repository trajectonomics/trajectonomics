/**
 * The CLI's own notes about a plan's stored claims, kept from its dry-run write (cli ADR-0075): the
 * separate-loans note on `allowances.mortgageInterestCeiling` and the `unclaimed` sentences. The page
 * shows each sentence as the CLI wrote it, apart from a departed id's quoted id, which it says in the
 * household's words. Pure.
 */
import type { Read, ScenarioTax, TaxNotes } from "../../contract"
import { NO_PEOPLE, type PersonNames } from "../item-names"
import { EARLIER_HOLDER } from "./flat-claims"

/**
 * Where the CLI's separate-loans sentence begins. The CLI appends it, after a space, to tax-core's own
 * short note on the same figure ("Home-loan interest ceiling, baht."); the page keeps the CLI's sentence only.
 */
export const SEPARATE_LOANS_SENTENCE =
	"Each separate Return's interest is taken to be on separate loans"

/**
 * How the CLI's sentence about a departed id opens, and the clause that tells it from the kept-claims sentence: only
 * the departed one is rewritten, because only that id is one the household no longer names.
 */
export const DEPARTED_CLAIMS_OPENING = 'The claims stored for "'
export const DEPARTED_CLAIMS_MARKER = '", who is not in the household, are on no Return.'

/** The words for a departed id that is not the recorded holder of the flat claims: never the id, never a guess at who. */
export const ANOTHER_PERSON = "another person"

/**
 * A departed id's note in the household's words, never the id the CLI quotes. The CLI writes it for every id the
 * household no longer names, so only the recorded `claimsHolder` is "the earlier holder"; any other id, such as a
 * renamed partner's, is "another person".
 */
export function departedNoteInHouseholdWords(
	note: string,
	people: PersonNames,
	holder: string | null = null,
): string {
	if (!note.startsWith(DEPARTED_CLAIMS_OPENING)) return note
	const close = note.indexOf(DEPARTED_CLAIMS_MARKER)
	if (close < 0) return note
	const id = note.slice(DEPARTED_CLAIMS_OPENING.length, close)
	const words = people.get(id)?.subject ?? (id === holder ? EARLIER_HOLDER.subject : ANOTHER_PERSON)
	return `The claims stored for ${words}${note.slice(close + 1)}`
}

/** The separate-loans note the assumptions state, or null when this write does not state one. */
function separateLoansOf(assumptions: ScenarioTax["assumptions"]): string | null {
	const entry = assumptions?.find((one) => one.path === "allowances.mortgageInterestCeiling")
	if (entry === undefined) return null
	const at = entry.note.indexOf(SEPARATE_LOANS_SENTENCE)
	return at < 0 ? null : entry.note.slice(at)
}

/** What the page keeps of a dry-run's result: the separate-loans note, then the unclaimed sentences. */
export function taxNotesOf(data: ScenarioTax): TaxNotes {
	return {
		separateLoans: separateLoansOf(data.assumptions),
		unclaimed: [...(data.unclaimed ?? [])],
	}
}

/** The read of the notes from a dry run's read; a refusal stays the Read's own error. */
export function taxNotesFrom(read: Read<ScenarioTax>): Read<TaxNotes> {
	if (!read.ok) return read
	return { argv: read.argv, ok: true, data: taxNotesOf(read.data) }
}

/**
 * The notes a read states, one paragraph each; none when the CLI refused the dry run, so the page shows nothing false.
 * `holder` is the profile's recorded `claimsHolder`, which tells the earlier holder from another departed id.
 */
export function claimNoteLines(
	read: Read<TaxNotes> | undefined,
	people: PersonNames = NO_PEOPLE,
	holder: string | null = null,
): readonly string[] {
	if (read?.ok !== true) return []
	const { separateLoans, unclaimed } = read.data
	const lines = unclaimed.map((note) => departedNoteInHouseholdWords(note, people, holder))
	return separateLoans === null ? lines : [separateLoans, ...lines]
}

/**
 * The CLI's own notes about a plan's stored claims, kept from its dry-run write (cli ADR-0075): the
 * separate-loans note on `allowances.mortgageInterestCeiling` and the `unclaimed` sentences. The page
 * shows each sentence as the CLI wrote it, so it adds no wording of its own. Pure.
 */
import type { Read, ScenarioTax, TaxNotes } from "../../contract"

/**
 * Where the CLI's separate-loans sentence begins. The CLI appends it, after a space, to tax-core's own
 * short note on the same figure ("Home-loan interest ceiling, baht."); the page keeps the CLI's sentence only.
 */
export const SEPARATE_LOANS_SENTENCE =
	"Each separate Return's interest is taken to be on separate loans"

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

/** The notes a read states, one paragraph each; none when the CLI refused the dry run, so the page shows nothing false. */
export function claimNoteLines(read: Read<TaxNotes> | undefined): readonly string[] {
	if (read?.ok !== true) return []
	const { separateLoans, unclaimed } = read.data
	return separateLoans === null ? [...unclaimed] : [separateLoans, ...unclaimed]
}

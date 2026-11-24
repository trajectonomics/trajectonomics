import type { EditInput } from "../../edit/edit"
import { isValidDate } from "../../snapshot/dates"
import type { AgainstChoice, ValueSheet } from "./types"

/** What the person has typed into the sheet: the date, the account to count against, and a value per account id. */
export interface SheetDraft {
	/** The "Value as of" date; empty means the Snapshot's As-of. */
	readonly date: string
	/** The account id the person chose to count against; empty until chosen. */
	readonly against: string
	readonly values: Readonly<Record<string, string>>
}

/** A message at one field of the sheet, or at the sheet as a whole. */
export interface SheetProblems {
	/** By account id. */
	readonly rows: Readonly<Record<string, string>>
	readonly date?: string
	readonly against?: string
	readonly general?: string
}

/** The rows an Edit sent, in order, so a refusal's `index` finds its account. */
export type SentRows = readonly string[]

export const NO_PROBLEMS: SheetProblems = { rows: {} }

/** The date the sheet states values as of: the one typed, or the Snapshot's As-of. */
export function effectiveDate(draft: SheetDraft, sheet: ValueSheet): string {
	return draft.date.trim() === "" ? sheet.asOf : draft.date.trim()
}

/** The chosen account, when it is still one the ledger offers. A remembered choice that has gone is none. */
export function chosenAgainst(draft: SheetDraft, sheet: ValueSheet): AgainstChoice | null {
	return sheet.choices.find((choice) => choice.id === draft.against) ?? null
}

/** The ids of the rows that carry a value: the rows the Edit sends. A row left empty is not sent. */
export function changedIds(draft: SheetDraft, sheet: ValueSheet): string[] {
	return sheet.groups
		.flatMap((group) => group.rows)
		.filter((row) => (draft.values[row.id] ?? "").trim() !== "")
		.map((row) => row.id)
}

/**
 * The Edit for a draft, or what stops it: no account to count against, a date that is not a date, or no value.
 * Values go as typed (only the spaces around them are trimmed); `traj` reads them and states every difference.
 */
export function recordValuesOf(
	draft: SheetDraft,
	sheet: ValueSheet,
): { ok: true; edit: EditInput; sent: SentRows } | { ok: false; problems: SheetProblems } {
	const against = chosenAgainst(draft, sheet)
	const date = effectiveDate(draft, sheet)
	const sent = changedIds(draft, sheet)
	const problems: { -readonly [K in keyof SheetProblems]: SheetProblems[K] } = { rows: {} }
	if (against === null) problems.against = "Choose the account the differences count against."
	if (!isValidDate(date)) problems.date = "A date such as 2026-10-31."
	if (sent.length === 0) problems.general = "Type a value for at least one account."
	if (problems.against || problems.date || problems.general) return { ok: false, problems }
	const values = sent.map((account) => ({
		account,
		date,
		value: (draft.values[account] ?? "").trim(),
	}))
	return { ok: true, edit: { kind: "record-values", against: against?.id ?? "", values }, sent }
}

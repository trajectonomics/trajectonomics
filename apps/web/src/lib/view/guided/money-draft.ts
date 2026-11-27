/**
 * The money step's answers: one draft per carried row, and the two typed totals of the short path. Amounts are
 * text; the commas come off before they are sent and nothing else about them changes (web ADR 0002).
 * Pure.
 */
import type { GuidedMoneyRow } from "./money"

/** One row's answers: kept or dropped, an amount (empty for the CLI's), and whether income stops at stop-work. */
export interface RowDraft {
	readonly keep: boolean
	readonly amount: string
	readonly earned: boolean
}

/** The drafts of every carried row, by the Account id. */
export type RowDrafts = Readonly<Record<string, RowDraft>>

/** The short path's two totals. */
export interface TotalsDraft {
	readonly income: string
	readonly spending: string
}

/** What an amount must look like once the commas are off. */
const AMOUNT = /^\d{1,15}(\.\d{1,2})?$/

/** The one amount problem, at a row or a total. */
export const AMOUNT_PROBLEM = "Enter an amount such as 12500 or 12500.50."

/** The problem when every row is dropped, so there is no plan to save. */
export const KEEP_PROBLEM = "Keep at least one row."

/** The starting drafts: every row kept, at the CLI's amount, with income earned. */
export function draftsOf(rows: readonly GuidedMoneyRow[]): RowDrafts {
	return Object.fromEntries(rows.map((row) => [row.id, { keep: true, amount: "", earned: true }]))
}

/** The text an amount sends: the commas off, and undefined for the empty one ("as the read states it"). */
export function amountSent(text: string): string | undefined {
	const amount = text.replaceAll(",", "")
	return amount === "" ? undefined : amount
}

/** Why a typed row amount cannot be sent, or null when it can; empty means the CLI's own amount. */
export function amountProblem(text: string): string | null {
	const amount = amountSent(text)
	return amount === undefined || AMOUNT.test(amount) ? null : AMOUNT_PROBLEM
}

/** Why a typed total cannot be sent, or null when it can: the short path states both, so neither may be empty. */
export function totalProblem(text: string): string | null {
	const amount = amountSent(text)
	return amount !== undefined && AMOUNT.test(amount) ? null : AMOUNT_PROBLEM
}

/** Why the kept rows cannot be saved, or null when at least one stays. */
export function keepProblem(drafts: RowDrafts): string | null {
	return Object.values(drafts).some((draft) => draft.keep) ? null : KEEP_PROBLEM
}

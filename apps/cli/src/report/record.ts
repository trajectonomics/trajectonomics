import type { Transaction } from "@trajectonomics/core/ledger"
import { z } from "zod"

/**
 * Whether the Ledger's record has started by an As-of, stated beside every reading that takes
 * one (ADR-0029's addendum). `report networth`, `balance` and `baseline show` share these two
 * names and this one rule, so no two of them can answer the same Ledger differently.
 */
export type RecordStart = {
	/** The earliest date the Ledger records, or null when it records none. */
	firstTransactionDate: string | null
	/** True when no Transaction is dated on or before the As-of, so a zero states no record, not no money. */
	noTransactionsBefore: boolean
}

/** The two result keys, as the strict output schema of each of the three commands publishes them. */
export const recordStartShape: {
	firstTransactionDate: z.ZodNullable<z.ZodString>
	noTransactionsBefore: z.ZodBoolean
} = {
	firstTransactionDate: z
		.string()
		.nullable()
		.describe(
			"The date, as YYYY-MM-DD, of the Ledger's earliest Transaction; null when it has none.",
		),
	noTransactionsBefore: z
		.boolean()
		.describe(
			"True when no Transaction is dated on or before the As-of, which includes a Ledger with none, so the zero figures state that the record has not started, not that nothing is held.",
		),
}

/** The earliest dated Transaction, whatever order the store returned them in. */
export function firstTransactionDateOf(transactions: readonly Transaction[]): string | null {
	let first: string | null = null
	for (const transaction of transactions) {
		if (first === null || transaction.date < first) first = transaction.date
	}
	return first
}

/**
 * The pair for one reading. A Ledger with no Transaction has no record at any date, so its
 * `firstTransactionDate` is null and `noTransactionsBefore` is true: every date precedes none.
 */
export function recordStartOf(transactions: readonly Transaction[], asOf: string): RecordStart {
	const firstTransactionDate = firstTransactionDateOf(transactions)
	return {
		firstTransactionDate,
		noTransactionsBefore: firstTransactionDate === null || firstTransactionDate > asOf,
	}
}

/**
 * The human-only sentence under a reading whose record has not started, or no block when it has.
 * JSON carries the pair and no sentence (ADR-0040 keeps the `hint` field for the store's own dead
 * end), so this is a layout of the same fact for a person at a terminal. A result that carries
 * a `hint` prints no note: the hint is the last line (ADR-0040) and already names the empty Ledger.
 */
export function recordNoteBlocks(data: Record<string, unknown>): string[] {
	if (data["noTransactionsBefore"] !== true || data["hint"] !== undefined) return []
	const first = data["firstTransactionDate"]
	const when =
		typeof first === "string"
			? `The first Transaction is dated ${first}, after the As-of ${String(data["asOf"])}`
			: "The Ledger records no Transaction"
	return [
		`note: ${when}, so this reading states that the record has not started, not that nothing is held.`,
	]
}

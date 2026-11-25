/**
 * The `record-values` Edit: today's value of many accounts, stated in one batch to `traj account value`
 * ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md), the
 * amendment of 2026-11-25). The page sends each value as typed; `traj` parses it and computes every
 * difference ([ADR 0002](../../../docs/adr/0002-the-cli-is-the-only-source-of-figures.md)).
 */
import { z } from "zod"
import type { AccountList } from "../contract"
import { isValidDate } from "../snapshot/dates"

/**
 * The most rows one Edit may carry. A balance history imported from a spreadsheet is accounts times months:
 * 4,000 is 33 accounts for ten years of month-ends, and a row is at most about 200 bytes of JSON, so a full
 * batch is under the server's 1 MiB body cap (`record-values.test.ts` pins it). It is under the CLI's own
 * limit of 5,000 values a document, which is why a history is one Edit, written in one transaction or none.
 */
export const RECORD_VALUES_MAX_ROWS = 4000

/** The longest value text one row may carry: `traj` reads a plain decimal, which is far shorter. */
export const RECORD_VALUE_MAX_LENGTH = 40

/** An account id as the ledger states it. The server also checks it is one the Snapshot holds. */
const accountId = z.string().min(1).max(100)

/** A date as `traj` takes it, one that exists on the calendar. */
const valueDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine(isValidDate, { message: "not a date" })

/** One value, as the page typed it. */
export const recordedValue = z.strictObject({
	account: accountId,
	date: valueDate,
	value: z.string().min(1).max(RECORD_VALUE_MAX_LENGTH),
})

/** The Edit: the account the differences count against, and the values. Strict, and bounded. */
export const recordValuesSchema = z.strictObject({
	kind: z.literal("record-values"),
	against: accountId,
	values: z.array(recordedValue).min(1).max(RECORD_VALUES_MAX_ROWS),
	// A preview runs the dry run only and answers its result: nothing is written, and no Snapshot is read again.
	preview: z.literal(true).optional(),
})
export type RecordValuesEdit = z.infer<typeof recordValuesSchema>

/** The ids an Edit names that the Snapshot's chart of accounts does not hold, `against` first. */
export function unknownAccountIds(
	edit: RecordValuesEdit,
	accounts: AccountList["accounts"],
): string[] {
	const held = new Set(accounts.map((account) => account.id))
	const named = [edit.against, ...edit.values.map((row) => row.account)]
	return [...new Set(named)].filter((id) => !held.has(id))
}

/** The document `traj account value --file -` reads: the Edit without its kind. */
export function valuesDocument(edit: RecordValuesEdit): { against: string; values: unknown[] } {
	return { against: edit.against, values: edit.values }
}

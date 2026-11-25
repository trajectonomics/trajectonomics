import { valuationEntry } from "@trajectonomics/core/ledger"
import { formatMinorUnits } from "../../store"
import { written } from "../../tx/legs"
import { type Batch, balanceOn, laterOf, record } from "./batch"
import { MEMO_PREFIX } from "./later"
import { laterNotes } from "./later-note"
import type { Prepared, ValuedRow } from "./types"

/** A draft id the core can tell apart; the store mints the real one when the row is written. */
function draftId(position: number): string {
	return `01940000-0000-7000-8000-${String(position).padStart(12, "0")}`
}

/**
 * Applies one entry to the Balance the earlier ones leave. It throws the core's refusal, which the
 * caller reports at the entry's own field.
 */
export function applyEntry(batch: Batch, entry: Prepared): ValuedRow {
	const { account, date, value } = entry
	const { transaction, before, difference } = valuationEntry(
		{
			id: draftId(batch.writes.length),
			date,
			account: account.id,
			against: batch.against.id,
			balance: balanceOn(batch, account, date),
			value,
		},
		batch.ledger.chart,
	)
	const row = { index: entry.index, account, date, before, value }
	if (transaction === undefined) return { ...row, difference, write: null, notes: [] }
	const memo = `${MEMO_PREFIX}${formatMinorUnits(value, account.currency)}`
	batch.writes.push(written(transaction, { date, memo }))
	for (const posting of transaction.postings) {
		record(batch, posting.accountId, date, BigInt(posting.amount))
	}
	const notes = laterNotes({
		account,
		date,
		difference,
		later: laterOf(batch, account, date),
		balanceAt: (asOf) => balanceOn(batch, account, asOf),
	})
	return { ...row, difference, write: batch.writes.length - 1, notes }
}

import { balance as balanceAt, type Transaction, valuationEntry } from "@trajectonomics/core/ledger"
import { type AccountRow, formatMinorUnits, type Ledger, type NewTransaction } from "../../store"
import { written } from "../../tx/legs"
import { laterNotes, MEMO_PREFIX, type StoredValuation } from "./later"
import type { Prepared, ValuedRow } from "./types"

/** What the entries applied so far added: the core's entries, for the next Balance, and the rows to write. */
export type Applied = { pending: Transaction[]; writes: NewTransaction[] }

/** A draft id the core can tell apart; the store mints the real one when the row is written. */
function draftId(position: number): string {
	return `01940000-0000-7000-8000-${String(position).padStart(12, "0")}`
}

/**
 * Applies one entry to the Balance the earlier ones leave. It throws the core's refusal, which the
 * caller reports at the entry's own field.
 */
export function applyEntry(
	ledger: Ledger,
	against: AccountRow,
	stored: readonly StoredValuation[],
	applied: Applied,
	entry: Prepared,
): ValuedRow {
	const { account, date, value } = entry
	const transactions = [...ledger.transactions, ...applied.pending]
	const current = balanceAt(transactions, account.id, date, ledger.chart).amount
	const { transaction, before, difference } = valuationEntry(
		{
			id: draftId(applied.pending.length),
			date,
			account: account.id,
			against: against.id,
			balance: current,
			value,
		},
		ledger.chart,
	)
	const row = { index: entry.index, account, date, before, value }
	if (transaction === undefined) return { ...row, difference, write: null, notes: [] }
	const memo = `${MEMO_PREFIX}${formatMinorUnits(value, account.currency)}`
	applied.writes.push(written(transaction, { date, memo }))
	applied.pending.push(transaction)
	const notes = laterNotes({
		ledger,
		stored,
		transactions: [...transactions, transaction],
		account,
		date,
		difference,
	})
	return { ...row, difference, write: applied.writes.length - 1, notes }
}

import { balance as balanceAt, type Transaction, valuationEntry } from "@trajectonomics/core/ledger"
import { type AccountRow, formatMinorUnits, type Ledger, type NewTransaction } from "../../store"
import { written } from "../../tx/legs"
import { laterNotes, MEMO_PREFIX, type StoredValuation } from "./later"
import type { Prepared, ValuedRow } from "./types"

/** What the entries applied so far added: the core's entries, for the next Balance, and the rows to write. */
export type Applied = { pending: Transaction[]; writes: NewTransaction[] }

/** An asset's value is its Debit balance; a liability's is what it owes, the Credit side. */
export function stated(account: AccountRow, balance: number): number {
	return account.type === "liability" ? 0 - balance : balance
}

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
	const built = valuationEntry(
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
	const before = stated(account, current)
	const row = { index: entry.index, account, date, before, value }
	if (built === undefined) return { ...row, difference: 0, write: null, notes: [] }
	const difference = value - before
	const memo = `${MEMO_PREFIX}${formatMinorUnits(value, account.currency)}`
	applied.writes.push(written(built, { date, memo }))
	applied.pending.push(built)
	const notes = laterNotes({
		ledger,
		stored,
		transactions: [...transactions, built],
		account,
		date,
		difference,
	})
	return { ...row, difference, write: applied.writes.length - 1, notes }
}

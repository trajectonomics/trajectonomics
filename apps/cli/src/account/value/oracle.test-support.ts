import {
	balance as balanceAt,
	LedgerValidationError,
	type Transaction,
	valuationEntry,
} from "@trajectonomics/core/ledger"
import { type AppError, isAppError } from "../../errors"
import {
	type AccountRow,
	formatMinorUnits,
	type Ledger,
	ledgerFailure,
	type NewTransaction,
	type Planned,
} from "../../store"
import type { PlannedRead } from "../../store/tx-planning"
import { written } from "../../tx/legs"
import { laterValuations, MEMO_PREFIX, storedValuations } from "./later"
import { laterNotes } from "./later-note"
import { againstOf, inApplyOrder, prepareAll } from "./prepare"
import { rejection } from "./rejection"
import type { Prepared, Refusal, Valuation, ValuedRow, ValueRequest } from "./types"

/**
 * The algorithm `applyEntry` had before it kept a running Balance: every entry copies the Ledger's
 * transactions and the earlier entries' and reads its Balance by scanning all of them. It is slow
 * and obviously right, so a test holds the fast one to its answers.
 */
function oracleEntry(
	ledger: Ledger,
	against: AccountRow,
	stored: ReturnType<typeof storedValuations>,
	applied: { pending: Transaction[]; writes: NewTransaction[] },
	entry: Prepared,
): ValuedRow {
	const { account, date, value } = entry
	const transactions = [...ledger.transactions, ...applied.pending]
	const current = balanceAt(transactions, account.id, date, ledger.chart).amount
	const { transaction, before, difference } = valuationEntry(
		{
			id: `01940000-0000-7000-8000-${String(applied.pending.length).padStart(12, "0")}`,
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
	const all = [...transactions, transaction]
	const notes = laterNotes({
		account,
		date,
		difference,
		later: laterValuations(ledger, stored, account, date),
		balanceAt: (asOf) => balanceAt(all, account.id, asOf, ledger.chart).amount,
	})
	return { ...row, difference, write: applied.writes.length - 1, notes }
}

/** What `planValues` yields with the slow algorithm: the writes and rows, or the refusal. */
export function oraclePlan(
	request: ValueRequest,
	{ ledger, rows }: PlannedRead,
): Planned<Valuation> | AppError {
	const against = againstOf(ledger, request)
	if (isAppError(against)) return against
	const { ready, refused } = prepareAll(ledger, against, request)
	if (refused.length > 0) return rejection(request, refused)
	const stored = storedValuations(ledger, rows)
	const applied: { pending: Transaction[]; writes: NewTransaction[] } = { pending: [], writes: [] }
	const valued: ValuedRow[] = []
	const failed: Refusal[] = []
	for (const entry of inApplyOrder(ready)) {
		try {
			valued.push(oracleEntry(ledger, against, stored, applied, entry))
		} catch (error) {
			if (!(error instanceof LedgerValidationError)) throw error
			const at = request.path(entry.index, "value")
			failed.push({ index: entry.index, error: ledgerFailure(error, at) })
		}
	}
	if (failed.length > 0) return rejection(request, failed)
	return { writes: applied.writes, value: { against, rows: valued } }
}

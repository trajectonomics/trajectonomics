import {
	type BalanceHistory,
	balanceHistory,
	LedgerValidationError,
} from "@trajectonomics/core/ledger"
import type { AccountRow, Ledger, NewTransaction } from "../../store"
import { datedAfter, laterValuations, type StoredValuation } from "./later"

/** What the batch has added to one account so far: the sum of its Postings and the latest date among them. */
type Moved = { total: bigint; latest: string }

/**
 * A batch being applied: the Ledger it reads, the rows it will write, and what it needs to read a
 * Balance in constant time. The Ledger is read once, and each entry's Balance is that read at the
 * entry's date plus the Postings of the entries before it (`moved`), so an entry costs the same
 * whether it is the first of a batch or the four-thousandth.
 */
export type Batch = {
	readonly ledger: Ledger
	readonly against: AccountRow
	readonly stored: readonly StoredValuation[]
	/** The rows the entries applied so far write, in the order they applied. */
	readonly writes: NewTransaction[]
	history: BalanceHistory | undefined
	readonly moved: Map<string, Moved>
	readonly later: Map<string, readonly StoredValuation[]>
}

/** A batch with nothing applied yet. */
export function startBatch(
	ledger: Ledger,
	against: AccountRow,
	stored: readonly StoredValuation[],
): Batch {
	return {
		ledger,
		against,
		stored,
		writes: [],
		history: undefined,
		moved: new Map(),
		later: new Map(),
	}
}

/**
 * An account's signed Balance on `asOf`: the Ledger as it was read, plus what the batch has added.
 * Entries apply in date order, so everything added so far is dated on or before `asOf`, and the
 * running total is the answer; a date before one already added means the order broke.
 */
function readBalance(batch: Batch, history: BalanceHistory, id: string, asOf: string): number {
	const moved = batch.moved.get(id)
	if (moved !== undefined && asOf < moved.latest) {
		throw new Error(`a Balance was read on ${asOf}, before ${moved.latest}, which the batch holds`)
	}
	return history.at(id, asOf, moved?.total ?? 0n)
}

/**
 * The account's signed Balance on `asOf`. `balance` refuses an overflow of any Leaf Account's
 * Balance, and a write moves the account it values and the one it posts against, so both are read:
 * the against account's overflow is reported at its own field, as `balance` reports it.
 */
export function balanceOn(batch: Batch, account: AccountRow, asOf: string): number {
	batch.history ??= balanceHistory(batch.ledger.transactions, batch.ledger.chart)
	const amount = readBalance(batch, batch.history, account.id, asOf)
	try {
		readBalance(batch, batch.history, batch.against.id, asOf)
	} catch (error) {
		if (!(error instanceof LedgerValidationError)) throw error
		throw new LedgerValidationError(
			error.code,
			`balance[${batch.against.id}]`,
			error.value,
			error.reason,
		)
	}
	return amount
}

/** The stored valuations of the account dated after `date`: the account's own are found once. */
export function laterOf(
	batch: Batch,
	account: AccountRow,
	date: string,
): readonly StoredValuation[] {
	let own = batch.later.get(account.id)
	if (own === undefined) {
		own = laterValuations(batch.ledger, batch.stored, account, "")
		batch.later.set(account.id, own)
	}
	return datedAfter(own, date)
}

/** Records what a Posting adds to an account, for the next entry's Balance. */
export function record(batch: Batch, id: string, date: string, amount: bigint): void {
	const moved = batch.moved.get(id) ?? { total: 0n, latest: date }
	moved.total += amount
	if (date > moved.latest) moved.latest = date
	batch.moved.set(id, moved)
}

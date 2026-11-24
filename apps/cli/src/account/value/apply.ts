import { type BalanceHistory, balanceHistory, valuationEntry } from "@trajectonomics/core/ledger"
import { type AccountRow, formatMinorUnits, type Ledger, type NewTransaction } from "../../store"
import { written } from "../../tx/legs"
import { datedAfter, laterValuations, MEMO_PREFIX, type StoredValuation } from "./later"
import { laterNotes } from "./later-note"
import type { Prepared, ValuedRow } from "./types"

/** What the batch has added to one account so far: each Posting's date and amount, and their sum. */
type Moved = { postings: { date: string; amount: bigint }[]; total: bigint; latest: string }

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

/** A draft id the core can tell apart; the store mints the real one when the row is written. */
function draftId(position: number): string {
	return `01940000-0000-7000-8000-${String(position).padStart(12, "0")}`
}

/**
 * The account's signed Balance on `asOf`: the Ledger as it was read, plus what the batch has added
 * dated up to it. Entries apply in date order, so everything added so far is normally dated on or
 * before `asOf` and the running total is the answer; an earlier-dated read sums what is dated up to it.
 */
function balanceOn(batch: Batch, account: AccountRow, asOf: string): number {
	batch.history ??= balanceHistory(batch.ledger.transactions, batch.ledger.chart)
	const moved = batch.moved.get(account.id)
	const plus =
		moved === undefined
			? 0n
			: asOf >= moved.latest
				? moved.total
				: moved.postings.reduce((sum, p) => (p.date <= asOf ? sum + p.amount : sum), 0n)
	return batch.history.at(account.id, asOf, plus)
}

/** The stored valuations of the account dated after `date`: the account's own are found once. */
function laterOf(batch: Batch, account: AccountRow, date: string): readonly StoredValuation[] {
	let own = batch.later.get(account.id)
	if (own === undefined) {
		own = laterValuations(batch.ledger, batch.stored, account, "")
		batch.later.set(account.id, own)
	}
	return datedAfter(own, date)
}

/** Records what an entry's Transaction adds to the account, for the next entry's Balance. */
function record(batch: Batch, account: AccountRow, date: string, amount: bigint): void {
	const moved = batch.moved.get(account.id) ?? { postings: [], total: 0n, latest: date }
	moved.postings.push({ date, amount })
	moved.total += amount
	if (date > moved.latest) moved.latest = date
	batch.moved.set(account.id, moved)
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
		if ((posting.accountId as string) === account.id) {
			record(batch, account, date, BigInt(posting.amount))
		}
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

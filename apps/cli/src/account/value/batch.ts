import { type BalanceHistory, balanceHistory } from "@trajectonomics/core/ledger"
import type { AccountRow, Ledger, NewTransaction } from "../../store"
import { datedAfter, laterValuations, type StoredValuation } from "./later"

/** One write to an account: its date, what the batch has added to the account by then, and whose it is. */
export type Step = {
	readonly account: AccountRow
	readonly date: string
	readonly total: bigint
	readonly index: number
}

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
	/** What the entries applied so far added to each account, in Minor Units. */
	readonly moved: Map<string, bigint>
	/** Every write to each account, in the order they applied: what `overflows` reads at the end. */
	readonly steps: Map<string, Step[]>
	/** The latest date among the entries applied so far. */
	latest: string
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
		steps: new Map(),
		latest: "",
		later: new Map(),
	}
}

/**
 * The account's signed Balance on `asOf`: the Ledger as it was read, plus what the batch has added,
 * with `balance`'s refusal of any Leaf Account whose Balance overflows. Entries apply in date order,
 * so everything added so far is dated on or before `asOf` and the running totals are the answer; a
 * date before one already added means the order broke.
 */
export function balanceOn(batch: Batch, account: AccountRow, asOf: string): number {
	if (asOf < batch.latest) {
		throw new Error(`a Balance was read on ${asOf}, before ${batch.latest}, which the batch holds`)
	}
	batch.history ??= balanceHistory(batch.ledger.transactions, batch.ledger.chart)
	return batch.history.at(account.id, asOf, batch.moved)
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

/** Records what the entry at `index` adds to an account, for the next entry's Balance and the final check. */
export function record(
	batch: Batch,
	account: AccountRow,
	date: string,
	amount: bigint,
	index: number,
): void {
	const total = (batch.moved.get(account.id) ?? 0n) + amount
	batch.moved.set(account.id, total)
	const own = batch.steps.get(account.id) ?? []
	own.push({ account, date, total, index })
	batch.steps.set(account.id, own)
	if (date > batch.latest) batch.latest = date
}

import { assertLeaf, firstUnsafe } from "./balance-leaf"
import { firstOverflow, type Overflow, type Reach, reachOf } from "./balance-reach"
import { leafOrder, type Series, seriesOf, sumUpTo, unsafe } from "./balance-series"
import type { ChartOfAccounts } from "./chart-map"
import { parseISODate } from "./date"
import { scanLedger } from "./ledger-scan"
import { toSafeAmount } from "./safe-amount"
import type { Transaction } from "./transaction"

/** One Leaf Account's Balance on any date, from one read of the Ledger. */
export interface BalanceHistory {
	/**
	 * The Leaf Account's Balance up to and including `asOf`, as `balance` gives it, with `extra`
	 * added: the Minor Units, by Account id, of Postings the Ledger read does not hold. Like
	 * `balance`, it throws `AMOUNT_OVERFLOW` for the first Leaf Account, in chart order, whose Balance
	 * is not a safe integer, whichever Leaf it is: the target's at `balance.amount`, any other's at
	 * `balance[<id>]`.
	 */
	readonly at: (accountId: string, asOf: string, extra?: ReadonlyMap<string, bigint>) => number
	/**
	 * The first date from `from` (inclusive) to `before` (exclusive; none means no end) on which the
	 * Leaf Account's Balance, with `shift` Minor Units added to it, is not a safe integer, and the
	 * sum it reaches. The Ledger read alone is not asked about: the Leaf's own Postings are. It
	 * answers in constant time once the Leaf's reach is noted, which is on its first question.
	 */
	readonly overflow: (
		accountId: string,
		shift: bigint,
		from: string,
		before?: string,
	) => Overflow | undefined
}

/**
 * Reads the Ledger once and answers `balance` for any Leaf Account and date from that read, so a
 * caller that asks many times pays for the scan once rather than once per question. Every answer
 * equals `balance(transactions, accountId, asOf, chart)`, errors included, and a Ledger the scan
 * refuses is refused here, at construction.
 */
export const balanceHistory = (
	transactions: readonly Transaction[],
	chart: ChartOfAccounts,
): BalanceHistory => {
	const rows = new Map<string, { date: string; amount: number }[]>()
	for (const { account, posting, date } of scanLedger(transactions, chart)) {
		const own = rows.get(account.id) ?? []
		own.push({ date, amount: posting.amount })
		rows.set(account.id, own)
	}
	const series = new Map<string, Series>()
	// The Leaves whose Balance leaves the safe range on some date: usually none, and the only ones
	// besides the caller's `extra` that can refuse a question.
	const strained = new Set<string>()
	for (const [id, own] of rows) {
		const built = seriesOf(own)
		series.set(id, built)
		if (built.sums.some(unsafe)) strained.add(id)
	}
	const order = leafOrder(chart)
	const reaches = new Map<string, Reach>()
	return Object.freeze<BalanceHistory>({
		at: (accountId, asOf, extra) => {
			assertLeaf(accountId, chart)
			const cutoff = parseISODate(asOf, "asOf")
			const balanceOf = (leaf: string): bigint =>
				sumUpTo(series.get(leaf), cutoff) + (extra?.get(leaf) ?? 0n)
			const leaves = [...strained, ...(extra?.keys() ?? [])]
			const first = firstUnsafe(leaves, order, balanceOf)
			if (first !== undefined) {
				toSafeAmount(balanceOf(first), first === accountId ? "balance.amount" : `balance[${first}]`)
			}
			return Number(balanceOf(accountId))
		},
		overflow: (accountId, shift, from, before) => {
			assertLeaf(accountId, chart)
			const own = series.get(accountId)
			const reach = (): Reach => {
				const noted = reaches.get(accountId) ?? reachOf(own!)
				reaches.set(accountId, noted)
				return noted
			}
			const end = before === undefined ? undefined : parseISODate(before, "before")
			return firstOverflow(own, reach, shift, parseISODate(from, "from"), end)
		},
	})
}

import { unsafe } from "./balance-series"
import type { ChartOfAccounts } from "./chart-map"
import { LedgerValidationError } from "./errors"
import { accountId as toAccountId } from "./ids"

/** Throws what `balance` throws for an account that is not a Leaf Account of the chart. */
export const assertLeaf = (accountId: string, chart: ChartOfAccounts): void => {
	const id = toAccountId(accountId)
	if (!chart.has(id)) {
		throw new LedgerValidationError(
			"UNKNOWN_ACCOUNT",
			"accountId",
			accountId,
			"is not in the chart of accounts",
		)
	}
	if (!chart.isLeaf(id)) {
		throw new LedgerValidationError(
			"NON_LEAF_ACCOUNT",
			"accountId",
			accountId,
			"is a header account",
		)
	}
}

/** The first of `leaves`, in chart order, whose Balance is not a safe integer. */
export const firstUnsafe = (
	leaves: Iterable<string>,
	order: ReadonlyMap<string, number>,
	balanceOf: (leaf: string) => bigint,
): string | undefined => {
	let first: string | undefined
	for (const leaf of leaves) {
		const place = order.get(leaf)
		if (place === undefined || !unsafe(balanceOf(leaf))) continue
		if (first === undefined || place < order.get(first)!) first = leaf
	}
	return first
}

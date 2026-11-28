import { isSafeInteger } from "../engine/overflow"
import type { CategoryTotal } from "./cashflow-flows"
import type { PeriodSums } from "./cashflow-sums"

/** True when a line of `sums`, a category or `unmet` leaves the safe integers (ADR 0034). */
export function overflows(
	sums: PeriodSums,
	categories: readonly CategoryTotal[],
	unmet: bigint,
): boolean {
	const groups = [
		sums.planned,
		sums.applied,
		sums.unfunded,
		sums.employer,
		sums.prepaid,
		sums.settled,
		sums.drawn,
		sums.surplus,
		sums.transfers,
		sums.unmoved,
	]
	const values = [
		...groups.flatMap((group) => [...group.values()]),
		...categories.map((item) => item.amount),
		unmet,
	]
	return !values.every(isSafeInteger)
}

import type { Flow } from "../types"
import type { ContributionLine, ExpenseLine, WithdrawalLine } from "../types/breakdown"
import type { PeriodSums } from "./cashflow-sums"

/** Flows of one kind, in Scenario order. */
export function ofKind<K extends Flow["kind"]>(
	flows: readonly Flow[],
	kind: K,
): readonly Extract<Flow, { kind: K }>[] {
	return flows.filter((flow): flow is Extract<Flow, { kind: K }> => flow.kind === kind)
}

export interface CategoryTotal {
	readonly category: string | null
	readonly amount: bigint
}

/** Expenses summed per exact category, in order of each category's first expense; `null` comes last. */
export function categoryTotals(
	flows: readonly Flow[],
	planned: ReadonlyMap<string, bigint>,
): readonly CategoryTotal[] {
	const totals = new Map<string | null, bigint>()
	for (const flow of ofKind(flows, "expense")) {
		const key = flow.category ?? null
		totals.set(key, (totals.get(key) ?? 0n) + (planned.get(flow.id) ?? 0n))
	}
	const found = [...totals]
		.filter(([, amount]) => amount !== 0n)
		.map(([category, amount]) => ({ category, amount }))
	return [
		...found.filter((item) => item.category !== null),
		...found.filter((item) => item.category === null),
	]
}

export function expenseLines(
	flows: readonly Flow[],
	planned: ReadonlyMap<string, bigint>,
): ExpenseLine[] {
	return ofKind(flows, "expense").flatMap((flow): ExpenseLine[] => {
		const amount = planned.get(flow.id) ?? 0n
		if (amount === 0n) return []
		const category = flow.category === undefined ? {} : { category: flow.category }
		return [{ flow: flow.id, ...category, amount: Number(amount) }]
	})
}

export function contributionLines(flows: readonly Flow[], sums: PeriodSums): ContributionLine[] {
	return ofKind(flows, "contribution").flatMap((flow): ContributionLine[] => {
		const applied = sums.applied.get(flow.id) ?? 0n
		const unfunded = sums.unfunded.get(flow.id) ?? 0n
		if (applied === 0n && unfunded === 0n) return []
		return [
			{ flow: flow.id, account: flow.target, applied: Number(applied), unfunded: Number(unfunded) },
		]
	})
}

export function withdrawalLines(
	flows: readonly Flow[],
	planned: ReadonlyMap<string, bigint>,
): WithdrawalLine[] {
	return ofKind(flows, "withdrawal").flatMap((flow): WithdrawalLine[] => {
		const amount = planned.get(flow.id) ?? 0n
		return amount === 0n ? [] : [{ flow: flow.id, account: flow.source, amount: Number(amount) }]
	})
}

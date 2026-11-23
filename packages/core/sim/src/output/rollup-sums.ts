import type { DayTotals } from "../engine/occurrence"
import type { Period } from "./periods"

export interface FlowSums {
	readonly income: bigint
	readonly expense: bigint
	readonly withdrawals: bigint
	readonly contributions: bigint
	readonly unfunded: bigint
	readonly levy: bigint
}

export function sumFlows(totals: readonly DayTotals[], period: Period): FlowSums {
	let income = 0n
	let expense = 0n
	let withdrawals = 0n
	let contributions = 0n
	let unfunded = 0n
	let levy = 0n
	for (const total of totals) {
		if (total.date < period.from || total.date > period.to) continue
		income += total.income
		expense += total.expense
		withdrawals += total.withdrawals
		contributions += total.contributions
		for (const amount of total.unfunded.values()) unfunded += amount
		levy += total.levy
	}
	return { income, expense, withdrawals, contributions, unfunded, levy }
}

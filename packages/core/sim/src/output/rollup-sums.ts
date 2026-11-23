import type { DayTotals } from "../engine/occurrence"
import type { Period } from "./periods"

/** The Flow totals of one period, in minor units: each field sums its Occurrences' amounts. */
export interface FlowSums {
	readonly income: bigint
	readonly expense: bigint
	readonly withdrawals: bigint
	readonly contributions: bigint
	readonly employer: bigint
	readonly unfunded: bigint
	readonly levy: bigint
}

/** Sums the Occurrences that land within `period`, both ends inclusive, into one set of totals. */
export function sumFlows(totals: readonly DayTotals[], period: Period): FlowSums {
	let income = 0n
	let expense = 0n
	let withdrawals = 0n
	let contributions = 0n
	let employer = 0n
	let unfunded = 0n
	let levy = 0n
	for (const total of totals) {
		if (total.date < period.from || total.date > period.to) continue
		income += total.income
		expense += total.expense
		withdrawals += total.withdrawals
		contributions += total.contributions
		employer += total.employer
		for (const amount of total.unfunded.values()) unfunded += amount
		levy += total.levy
	}
	return { income, expense, withdrawals, contributions, employer, unfunded, levy }
}

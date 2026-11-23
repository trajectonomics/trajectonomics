import type { BasisPoints, DateString, Flow, SpendingRule } from "../types"
import { oracleFixYear } from "./oracle-rule-year"

/** One Rule year as the oracle keeps it. */
export interface OracleRuleYear {
	readonly date: DateString
	readonly portfolio: bigint
	readonly amount: bigint
	readonly action: string
	/** Occurrences the year has landed so far, and what they paid. */
	count: number
	paid: bigint
}

/** Every Occurrence a rule Flow has landed: its dates, and the Rule years they began. */
export interface OracleRuleLog {
	readonly dates: DateString[]
	readonly years: OracleRuleYear[]
}

export function oracleRuleLog(): OracleRuleLog {
	return { dates: [], years: [] }
}

/** What one Occurrence of `flow` pays on `date`: a Rule year is twelve Occurrences, or one for an annual Flow (ADR 0023). */
export function oracleRulePay(
	log: OracleRuleLog,
	flow: Flow & { rule: SpendingRule },
	at: { date: DateString; years: number; inflation: BasisPoints },
	read: (account: string) => bigint,
): bigint {
	const index = Math.floor(log.dates.length / (flow.frequency === "annual" ? 1 : 12))
	if (index === log.years.length) {
		const portfolio = flow.rule.portfolio.reduce((sum, id) => sum + read(id), 0n)
		const before = log.years.map((year) => year.amount)
		const fixed = oracleFixYear(flow.rule, { ...at, index, portfolio, before })
		log.years.push({ date: at.date, portfolio, ...fixed, count: 0, paid: 0n })
	}
	const year = log.years[index]!
	const k = BigInt(year.count + 1)
	const part = (year.amount * k) / 12n - (year.amount * (k - 1n)) / 12n
	const pay = flow.frequency === "annual" ? year.amount : part
	year.count++
	year.paid += pay
	log.dates.push(at.date)
	return pay
}

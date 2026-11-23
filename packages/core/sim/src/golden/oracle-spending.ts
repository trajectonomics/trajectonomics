import type { SpendingRule } from "../types"
import { oraclePathSeed, oracleWords } from "./oracle-prng"
import { oracleFixYear } from "./oracle-rule-year"

/**
 * A cash plan the oracle replays by brute force: one Account holding `opening`, a rent paid each month,
 * and a monthly rule Flow that reads the same Account on the first day of each of its twelve-month Rule
 * years and pays a twelfth of the year's amount a month, from month `ruleStart` up to (not including)
 * month `ruleEnd`. Every month draws a bucket from the seeded stream; roll-ups are calendar years from
 * month 0, the last one clipped when `months` is not a multiple of twelve.
 */
export interface OracleSpendingPlan {
	readonly opening: bigint
	readonly rent: bigint
	readonly rule: SpendingRule
	readonly inflationBps?: number
	readonly months: number
	readonly ruleStart?: number
	readonly ruleEnd?: number
	readonly buckets: readonly { readonly returnBps: bigint; readonly weight: bigint }[]
	readonly seed: bigint
}

export interface OraclePath {
	/** What the rule paid in each roll-up. */
	readonly spent: bigint[]
	/** The path's lowest year; absent when it has no whole year and did not run out. */
	readonly lowest?: bigint
}

/** `numerator / denominator`, ties away from zero, for a non-negative numerator. */
function halfUp(numerator: bigint, denominator: bigint): bigint {
	return (numerator * 2n + denominator) / (denominator * 2n)
}

/** The return, in basis points, of each month's row on path `index`: the first bucket whose cumulative weight exceeds the draw. */
function returnsOf(plan: OracleSpendingPlan, index: number): bigint[] {
	return oracleWords(oraclePathSeed(plan.seed, index), plan.months).map((word) => {
		const draw = word >> 32n
		let total = 0n
		for (const bucket of plan.buckets) {
			total += bucket.weight
			if (draw < total) return bucket.returnBps
		}
		throw new Error("weights do not total 2^32")
	})
}

/** The smaller of two amounts (`Math.min` takes no BigInt). */
function least(a: bigint, b: bigint): bigint {
	return a - b < 0n ? a : b
}

/** The lowest year: 0 if the walk broke; else the least roll-up that has all twelve of its months paid. */
function lowestOf(plan: OracleSpendingPlan, spent: bigint[], lastMonth: number, broke: boolean) {
	if (broke) return 0n
	const first = plan.ruleStart ?? 0
	const end = Math.min(plan.ruleEnd ?? plan.months, plan.months, lastMonth + 1)
	const whole = spent.filter((_, year) => {
		const paying = Math.min(end, 12 * year + 12) - Math.max(first, 12 * year)
		return paying === 12
	})
	return whole.length === 0 ? undefined : whole.reduce(least)
}

/** The rule's amount for the Rule year that begins this month (the year's fixed `amount`, ADR 0023). */
function yearAmount(plan: OracleSpendingPlan, since: number, cash: bigint, before: bigint[]) {
	const input = { index: since / 12, date: "2026-01-01", years: since / 12, portfolio: cash }
	const { amount } = oracleFixYear(plan.rule, {
		...input,
		inflation: plan.inflationBps ?? 0,
		before,
	})
	before.push(amount)
	return amount
}

/** Months since the rule began on `month`, or `undefined` before it begins or from its `end`. */
function sinceOf(plan: OracleSpendingPlan, month: number): number | undefined {
	const since = month - (plan.ruleStart ?? 0)
	return since < 0 || month >= (plan.ruleEnd ?? plan.months) ? undefined : since
}

/** What the rule pays in the month `since` months into a Rule year fixed at `yearly`: a twelfth, exactly split. */
function monthlyPay(yearly: bigint, since: number): bigint {
	const k = BigInt((since % 12) + 1)
	return (yearly * k) / 12n - (yearly * (k - 1n)) / 12n
}

/** What the rule paid in each roll-up on path `index`, month by month, stopping when cash runs out. */
export function oraclePath(plan: OracleSpendingPlan, index: number): OraclePath {
	const returns = returnsOf(plan, index)
	const spent: bigint[] = Array.from({ length: Math.ceil(plan.months / 12) }, () => 0n)
	const amounts: bigint[] = []
	let cash = plan.opening
	let yearly = 0n
	let broke = false
	let month = 0
	for (; month < plan.months && !broke; month++) {
		if (month > 0) cash = halfUp(cash * (10000n + returns[month - 1]!), 10000n)
		const since = sinceOf(plan, month)
		if (since !== undefined && since % 12 === 0) yearly = yearAmount(plan, since, cash, amounts)
		const pay = since === undefined ? 0n : monthlyPay(yearly, since)
		const outflow = pay + plan.rent
		const met = least(outflow, cash)
		spent[Math.floor(month / 12)]! += (met * pay) / outflow
		cash -= met
		broke = met < outflow
	}
	const lowest = lowestOf(plan, spent, month - 1, broke)
	return { spent, ...(lowest === undefined ? {} : { lowest }) }
}

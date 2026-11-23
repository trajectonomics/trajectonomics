import type { BasisPoints, DateString, Rounding, SpendingRule } from "../types"
import { oracleGrow } from "./oracle-money"

/** The inputs of one Rule year: its position, its portfolio, and the amounts of the years before it. */
export interface OracleYearInput {
	readonly index: number
	readonly date: DateString
	/** Whole years since the Flow's `start`, which a floor or ceiling grows by. */
	readonly years: number
	readonly portfolio: bigint
	readonly inflation: BasisPoints
	/** The amounts fixed so far, oldest first. */
	readonly before: readonly bigint[]
}

export interface OracleFixed {
	readonly amount: bigint
	readonly action: string
}

/** `numerator / 10000` of a non-negative numerator, rounded as `mode` says. */
export function oracleDivide(numerator: bigint, mode: Rounding): bigint {
	if (mode === "floor") return numerator / 10000n
	if (mode === "ceil") return (numerator + 9999n) / 10000n
	return (numerator * 2n + 10000n) / 20000n
}

function rateOn(rule: SpendingRule, date: DateString): bigint {
	let bps = rule.rateBps
	if (rule.kind === "currentRate")
		for (const step of rule.steps ?? []) if (step.from <= date) bps = step.bps
	return BigInt(bps)
}

function clamp(rule: SpendingRule, raw: bigint, input: OracleYearInput): OracleFixed {
	if (rule.kind !== "currentRate") return { amount: raw, action: "none" }
	const grow = (bound: { amount: number; growth: "inflation" | { bps: number } }): bigint =>
		oracleGrow(
			BigInt(bound.amount),
			bound.growth === "inflation" ? input.inflation : bound.growth.bps,
			365 * input.years,
		)
	const low = rule.floor && grow(rule.floor)
	const high = rule.ceiling && grow(rule.ceiling)
	const lifted = low !== undefined && raw < low ? low : raw
	const capped = high !== undefined && lifted > high
	const amount = capped ? high : lifted
	return { amount, action: amount === raw ? "none" : capped ? "ceiling" : "floor" }
}

function guarded(rule: SpendingRule, input: OracleYearInput): OracleFixed {
	const grown = oracleGrow(input.before[input.index - 1]!, input.inflation, 365)
	const left = grown * 10000n * 10000n
	const right = input.portfolio * BigInt(rule.rateBps)
	if (rule.kind === "guardrails" && rule.upper && left > right * BigInt(10000 + rule.upper.bps)) {
		const moved = grown * BigInt(10000 - rule.upper.adjustBps)
		return { amount: oracleDivide(moved, rule.rounding), action: "cut" }
	}
	if (rule.kind === "guardrails" && rule.lower && left < right * BigInt(10000 - rule.lower.bps)) {
		const moved = grown * BigInt(10000 + rule.lower.adjustBps)
		return { amount: oracleDivide(moved, rule.rounding), action: "raise" }
	}
	return { amount: grown, action: "none" }
}

/** The amount a Rule year fixes, by the issue's formulas on exact integers. */
export function oracleFixYear(rule: SpendingRule, input: OracleYearInput): OracleFixed {
	const raw = oracleDivide(input.portfolio * rateOn(rule, input.date), rule.rounding)
	if (rule.kind === "currentRate") return clamp(rule, raw, input)
	if (input.index === 0) return { amount: raw, action: "none" }
	if (rule.kind === "guardrails") return guarded(rule, input)
	const amount = oracleGrow(input.before[0]!, input.inflation, 365 * input.index)
	return { amount, action: "none" }
}

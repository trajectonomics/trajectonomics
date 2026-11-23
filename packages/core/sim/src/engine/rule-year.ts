import { roundedDivide } from "../levy/scale"
import { grow } from "../money/growth"
import type {
	BasisPoints,
	CurrentRateRule,
	DateString,
	GuardrailsRule,
	RuleAction,
	SpendingRule,
} from "../types"
import { grownAmount } from "./amount"

/** What fixes one Rule year's amount: where it starts, the portfolio, and the years before it. */
export interface YearInput {
	readonly date: DateString
	/** Whole years of the Flow's `start` at the year's first Occurrence, which a floor or ceiling grows by. */
	readonly years: number
	readonly inflation: BasisPoints
	/** The portfolio's value `P` on `date`. */
	readonly portfolio: bigint
	/** Rule years already begun: 0 for the first. */
	readonly index: number
	/** The first year's amount `Y₀` and the year before this one's amount; both 0 in the first year. */
	readonly first: bigint
	readonly previous: bigint
}

export interface Fixed {
	readonly amount: bigint
	readonly action: RuleAction
}

const SCALE = 10_000n

/** `P × bps / 10000`, rounded as the rule says. */
function share(rule: SpendingRule, portfolio: bigint, bps: BasisPoints): bigint {
	return roundedDivide(portfolio * BigInt(bps), SCALE, rule.rounding)
}

/** `Y₀` in the first year, then `Y₀` grown by inflation for each whole year since. */
export function initialYear(rule: SpendingRule, input: YearInput): Fixed {
	if (input.index === 0)
		return { amount: share(rule, input.portfolio, rule.rateBps), action: "none" }
	return { amount: grow(input.first, input.inflation, input.index * 365), action: "none" }
}

/** The rate in force on a day: the last step whose `from` is on or before it, else `rateBps`. */
function rateOn(rule: CurrentRateRule, date: DateString): BasisPoints {
	let bps = rule.rateBps
	for (const step of rule.steps ?? []) if (step.from <= date) bps = step.bps
	return bps
}

/** The portfolio times the rate in force, raised to the floor and cut to the ceiling; the ceiling wins. */
export function currentYear(rule: CurrentRateRule, input: YearInput): Fixed {
	const raw = share(rule, input.portfolio, rateOn(rule, input.date))
	const { floor, ceiling } = rule
	const grown = (bound: typeof floor) =>
		bound === undefined
			? undefined
			: grownAmount(bound.amount, bound.growth, input.years, input.inflation)
	const low = grown(floor)
	const high = grown(ceiling)
	let amount = low !== undefined && raw < low ? low : raw
	if (high !== undefined && amount > high) amount = high
	if (amount === raw) return { amount, action: "none" }
	return { amount, action: amount === high ? "ceiling" : "floor" }
}

/** Last year's amount grown a year, cut when the rate rose past `upper` and raised when it fell past `lower`. */
export function guardrailsYear(rule: GuardrailsRule, input: YearInput): Fixed {
	if (input.index === 0) return initialYear(rule, input)
	const grown = grow(input.previous, input.inflation, 365)
	const rate = input.portfolio * BigInt(rule.rateBps)
	const scaled = grown * SCALE * SCALE
	const { upper, lower } = rule
	const moved = (adjust: bigint, action: RuleAction): Fixed => ({
		amount: roundedDivide(grown * adjust, SCALE, rule.rounding),
		action,
	})
	if (upper !== undefined && scaled > rate * (SCALE + BigInt(upper.bps))) {
		return moved(SCALE - BigInt(upper.adjustBps), "cut")
	}
	if (lower !== undefined && scaled < rate * (SCALE - BigInt(lower.bps))) {
		return moved(SCALE + BigInt(lower.adjustBps), "raise")
	}
	return { amount: grown, action: "none" }
}

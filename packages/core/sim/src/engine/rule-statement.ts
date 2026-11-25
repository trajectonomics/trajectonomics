import { countedDays } from "../calendar/counted"
import { deflate } from "../money/growth"
import type {
	BasisPoints,
	DateString,
	Projection,
	ProjectionProblem,
	Scenario,
	SpendingRuleStatement,
	SpendingRuleYear,
} from "../types"
import { isRuled } from "../types"
import { isSafeInteger, overflow } from "./overflow"
import type { RuleBook, RuleYear } from "./rule-book"

type YearOutcome = { readonly year: SpendingRuleYear } | { readonly problem: ProjectionProblem }

/**
 * One Rule year as stated. `real` is one deflation of each stated nominal, `amount` and `paid`, from the
 * Rule year's first date back to `start` (ADR 0023). A real figure exceeds its nominal under negative
 * inflation, so every figure is checked as an estate figure is: one that leaves the safe integers is
 * `VALUE_OVERFLOW` on the Rule year's date (#387).
 */
function statedYear(year: RuleYear, inflation: BasisPoints, start: DateString): YearOutcome {
	const days = countedDays(start, year.date)
	const real = {
		amount: deflate(year.amount, inflation, days),
		paid: deflate(year.paid, inflation, days),
	}
	const rate = year.portfolio === 0n ? undefined : (year.amount * 10_000n) / year.portfolio
	const figures = [year.portfolio, year.amount, year.paid, real.amount, real.paid, rate ?? 0n]
	if (!figures.every(isSafeInteger)) return { problem: overflow(year.date) }
	return {
		year: {
			date: year.date,
			portfolio: Number(year.portfolio),
			amount: Number(year.amount),
			paid: Number(year.paid),
			real: { amount: Number(real.amount), paid: Number(real.paid) },
			...(rate === undefined ? {} : { withdrawalRateBps: Number(rate) }),
			action: year.action,
		},
	}
}

export type RuleOutcome =
	| { readonly statements: readonly SpendingRuleStatement[] }
	| { readonly problem: ProjectionProblem }

/** One Spending rule statement per rule Flow in Scenario order: each Rule year it began, as a run kept it. */
export function ruleStatements(
	book: RuleBook | undefined,
	scenario: Scenario,
	start: DateString,
): RuleOutcome {
	const statements: SpendingRuleStatement[] = []
	for (const flow of scenario.flows) {
		if (!isRuled(flow)) continue
		const years: SpendingRuleYear[] = []
		for (const year of book?.get(flow.id)?.years ?? []) {
			const stated = statedYear(year, scenario.economy.inflation, start)
			if ("problem" in stated) return stated
			years.push(stated.year)
		}
		statements.push({ flow: flow.id, years })
	}
	return { statements }
}

/** The Projection with its Spending rule statements when `wanted`, or the overflow that stopped them. */
export function withRules(
	projection: Projection,
	wanted: boolean,
	book: RuleBook | undefined,
	scenario: Scenario,
	start: DateString,
): { readonly projection: Projection } | { readonly problem: ProjectionProblem } {
	if (!wanted) return { projection }
	const rules = ruleStatements(book, scenario, start)
	if ("problem" in rules) return rules
	return { projection: { ...projection, spendingRules: rules.statements } }
}

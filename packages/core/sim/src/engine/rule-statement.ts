import { countedDays } from "../calendar/counted"
import { deflate } from "../money/growth"
import type {
	BasisPoints,
	DateString,
	RealRuleYear,
	Scenario,
	SpendingRuleStatement,
} from "../types"
import { isRuled } from "../types"
import type { RuleBook } from "./rule-book"

/**
 * A Rule year's figures in start-of-timeline money. The nominal figures are safe integers (`rule-book.ts`
 * checks them); a real one exceeds its nominal only under negative inflation, and a run whose rule amount
 * grows that large overflows the row's balances first, so no guard is reached here (#387 tracks a guard).
 */
function realYear(
	year: { readonly amount: bigint; readonly paid: bigint },
	inflation: BasisPoints,
	days: number,
): RealRuleYear {
	return {
		amount: Number(deflate(year.amount, inflation, days)),
		paid: Number(deflate(year.paid, inflation, days)),
	}
}

/**
 * One Spending rule statement per rule Flow in Scenario order: each Rule year it began, as a run kept it.
 * `real` is one deflation of each stated nominal, `amount` and `paid`, from the Rule year's first date back
 * to `start` (ADR 0023).
 */
export function ruleStatements(
	book: RuleBook | undefined,
	scenario: Scenario,
	start: DateString,
): readonly SpendingRuleStatement[] {
	const inflation = scenario.economy.inflation
	const statements: SpendingRuleStatement[] = []
	for (const flow of scenario.flows) {
		if (!isRuled(flow)) continue
		const years = book?.get(flow.id)?.years ?? []
		statements.push({
			flow: flow.id,
			years: years.map((year) => ({
				date: year.date,
				portfolio: Number(year.portfolio),
				amount: Number(year.amount),
				paid: Number(year.paid),
				real: realYear(year, inflation, countedDays(start, year.date)),
				...(year.portfolio === 0n
					? {}
					: { withdrawalRateBps: Number((year.amount * 10_000n) / year.portfolio) }),
				action: year.action,
			})),
		})
	}
	return statements
}

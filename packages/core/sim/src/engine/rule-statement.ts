import type { Scenario, SpendingRuleStatement } from "../types"
import { isRuled } from "../types"
import type { RuleBook } from "./rule-book"

/** One Spending rule statement per rule Flow in Scenario order: each Rule year it began, as a run kept it. */
export function ruleStatements(
	book: RuleBook | undefined,
	scenario: Scenario,
): readonly SpendingRuleStatement[] {
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
				...(year.portfolio === 0n
					? {}
					: { withdrawalRateBps: Number((year.amount * 10_000n) / year.portfolio) }),
				action: year.action,
			})),
		})
	}
	return statements
}

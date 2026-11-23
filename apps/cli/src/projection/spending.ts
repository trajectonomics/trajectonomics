import type { SpendingRuleStatement } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { fail } from "../errors"
import { formatPercent } from "../scenario/percent"
import { moneyOf } from "./money"
import type { SpendingRuleRow, SpendingRulesTable } from "./spending-view"

/*
 * `projection run --spending`'s rows (cli ADR-0063): the engine's own Rule years in the CLI's money.
 * Each figure is the engine's; the withdrawal rate is its basis points written as a percent.
 */

/** One row per rule Flow and Rule year, in the engine's order, which is the Scenario's for the Flows. */
export function spendingRowsOf(
	statements: readonly SpendingRuleStatement[],
	currency: string,
): SpendingRuleRow[] {
	const money = moneyOf(currency)
	return statements.flatMap((statement) =>
		statement.years.map((year) => ({
			flow: statement.flow,
			date: year.date,
			portfolio: money(year.portfolio),
			amount: money(year.amount),
			paid: money(year.paid),
			// Absent when the engine states none: the portfolio was worth nothing that day.
			...(year.withdrawalRateBps === undefined
				? {}
				: { withdrawalRate: formatPercent(year.withdrawalRateBps) }),
			action: year.action,
		})),
	)
}

/** The table `--spending` adds (cli ADR-0063). The engine states one only when the Scenario has a rule Flow. */
export function spendingTableOf(
	statements: readonly SpendingRuleStatement[] | undefined,
	currency: string,
): SpendingRulesTable | AppError {
	if (statements === undefined) {
		return fail("internal", {
			message: "The engine returned no spending rule statements for --spending.",
		})
	}
	const rows = spendingRowsOf(statements, currency)
	return { name: "spendingRules", count: rows.length, rows }
}

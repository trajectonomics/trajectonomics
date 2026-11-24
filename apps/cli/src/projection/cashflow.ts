import type { CashflowBreakdown } from "@trajectonomics/core/sim"
import type { CashflowRow } from "./cashflow-view"
import { moneyOf } from "./money"

/*
 * `projection run --breakdown`'s rows (cli ADR-0058): each Annual roll-up's cash flow as the engine
 * routed it, one row per line. The engine decides every line and every amount; this module only names
 * the lines in the long-table shape and formats the engine's integer minor units with the Currency's
 * formatter.
 */

/** One engine line before it is named: its group, its names and its engine minor units. */
type Line = Omit<CashflowRow, "index" | "from" | "to" | "amount"> & { minor: number }

/**
 * Every line of one roll-up in the engine's order, the groups in the order `CASHFLOW_GROUPS` lists.
 * A `contribution` line is the applied amount and an `unfunded` line the dropped part; a line whose
 * amount is zero is left out, as the engine leaves it out.
 */
function linesOf(breakdown: CashflowBreakdown): Line[] {
	const none = { id: null, account: null, category: null }
	const groups: Line[][] = [
		breakdown.income.map((line) => ({
			...none,
			group: "income",
			id: line.flow,
			minor: line.amount,
		})),
		(breakdown.payouts ?? []).map((line) => ({
			...none,
			group: "payout",
			account: line.account,
			minor: line.amount,
		})),
		breakdown.prepaid.map((line) => ({
			...none,
			group: "prepaid",
			id: line.levy,
			minor: line.amount,
		})),
		breakdown.settlements.map((line) => ({
			...none,
			group: "settlement",
			id: line.levy,
			minor: line.amount,
		})),
		breakdown.expenses.map((line) => ({
			...none,
			group: "expense",
			id: line.flow,
			category: line.category ?? null,
			minor: line.amount,
		})),
		breakdown.categories.map((line) => ({
			...none,
			group: "category",
			id: line.category,
			minor: line.amount,
		})),
		breakdown.contributions.map((line) => ({
			...none,
			group: "contribution",
			id: line.flow,
			account: line.account,
			minor: line.applied,
		})),
		breakdown.contributions.map((line) => ({
			...none,
			group: "unfunded",
			id: line.flow,
			account: line.account,
			minor: line.unfunded,
		})),
		(breakdown.employer ?? []).map((line) => ({
			...none,
			group: "employer",
			id: line.flow,
			account: line.account,
			minor: line.amount,
		})),
		breakdown.withdrawals.map((line) => ({
			...none,
			group: "withdrawal",
			id: line.flow,
			account: line.account,
			minor: line.amount,
		})),
		breakdown.drawn.map((line) => ({
			...none,
			group: "drawn",
			account: line.account,
			minor: line.amount,
		})),
		breakdown.surplus.map((line) => ({
			...none,
			group: "surplus",
			account: line.account,
			minor: line.amount,
		})),
		[{ ...none, group: "unmet", minor: breakdown.unmet }],
	]
	return groups.flat().filter((line) => line.minor !== 0)
}

/**
 * The long table of `projection run --breakdown`: one row per roll-up and line, roll-up by roll-up
 * in the engine's order. Amounts are the engine's minor units at the Currency's own scale.
 */
export function cashflowRowsOf(
	breakdowns: readonly CashflowBreakdown[],
	currency: string,
): CashflowRow[] {
	const money = moneyOf(currency)
	return breakdowns.flatMap((breakdown) =>
		linesOf(breakdown).map(({ minor, ...line }) => ({
			index: breakdown.index,
			from: breakdown.from,
			to: breakdown.to,
			...line,
			amount: money(minor),
		})),
	)
}

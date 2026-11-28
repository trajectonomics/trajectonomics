/** Checks shared by the cash-flow breakdown tests: the identity, and each total against its roll-up. */
import type { AnnualRollup, CashflowBreakdown, CashflowLines } from "../types"

interface Amounts {
	readonly amount: number
}

function sum(lines: readonly Amounts[]): number {
	return lines.reduce((total, line) => total + line.amount, 0)
}

/** Money in and money out of one period, the two sides of the identity, in minor units. */
export function identitySides(line: CashflowLines): {
	readonly moneyIn: number
	readonly moneyOut: number
} {
	const moneyIn =
		sum(line.income) +
		sum(line.payouts ?? []) +
		sum(line.withdrawals) +
		sum(line.drawn) +
		line.unmet
	const moneyOut =
		sum(line.prepaid) +
		sum(line.settlements) +
		sum(line.expenses) +
		line.contributions.reduce((total, item) => total + item.applied, 0) +
		sum(line.surplus)
	return { moneyIn, moneyOut }
}

/** The names of the breakdown totals that differ from their Annual roll-up field or the category total. */
export function rollupMismatches(annual: AnnualRollup, line: CashflowBreakdown): readonly string[] {
	const levy = sum(line.prepaid) + sum(line.settlements)
	const checks: readonly (readonly [string, number, number])[] = [
		["income", sum(line.income) + sum(line.payouts ?? []), annual.income],
		["payouts", sum(line.payouts ?? []), annual.payouts ?? 0],
		["expense", sum(line.expenses), annual.expense],
		["categories", sum(line.categories), sum(line.expenses)],
		["contributions", line.contributions.reduce((t, c) => t + c.applied, 0), annual.contributions],
		[
			"unfunded",
			line.contributions.reduce((t, c) => t + c.unfunded, 0),
			annual.unfundedContributions,
		],
		["levy", levy, annual.levy ?? 0],
		["withdrawals", sum(line.withdrawals), annual.withdrawals ?? 0],
		["unmet", line.unmet, annual.unmet],
	]
	return checks.filter(([, got, want]) => got !== want).map(([name]) => name)
}

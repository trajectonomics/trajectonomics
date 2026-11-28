import { type RollupFigures, sumOf } from "./cashflow-totals"
import { moneyOf } from "./money"

/*
 * The small readers of `projection run --breakdown`'s human block (cli ADR-0058): a table row's fields
 * as the text the engine stated them, and the lines the block prints beside the income it is part of.
 */

/** One printed row of a block: a section total, or a line under it. */
export type BlockRow = { line: string; amount: string }

/** A field of a table row as the text the engine stated it; anything else is a broken result. */
export function textOf(value: unknown, field: string): string {
	if (typeof value !== "string")
		throw new Error(`a cash-flow ${field} is not text: ${String(value)}`)
	return value
}

/** One Annual roll-up's figures, as the totals read them. */
export function figuresOf(row: Record<string, unknown>): RollupFigures {
	return {
		income: textOf(row["income"], "income"),
		expense: textOf(row["expense"], "expense"),
		contributions: textOf(row["contributions"], "contributions"),
		unfundedContributions: textOf(row["unfundedContributions"], "unfundedContributions"),
		unmet: textOf(row["unmet"], "unmet"),
	}
}

/** A field of a table row that may be absent, as the text the engine stated it. */
export function optionalText(value: unknown, field: string): string | undefined {
	return value === undefined ? undefined : textOf(value, field)
}

/** An engine line as the totals read it. */
export function lineOf(line: Record<string, unknown>): { group: string; amount: string } {
	return { group: textOf(line["group"], "group"), amount: textOf(line["amount"], "amount") }
}

/**
 * What moved in or out of Accounts without passing through the household's cash, under the roll-up's
 * totals: the employer's share that landed in Accounts and the fees charged to them. Each is the
 * engine's own figure, printed only when the Scenario declares it, and neither is in the identity.
 */
export function outsideCash(annual: Record<string, unknown>): BlockRow[] {
	const employer = optionalText(annual["employerContributions"], "employerContributions")
	const fees = optionalText(annual["fees"], "fees")
	return [
		...(employer === undefined ? [] : [{ line: "employer paid in (not cash)", amount: employer }]),
		...(fees === undefined ? [] : [{ line: "fees charged (not cash)", amount: fees }]),
	]
}

/**
 * The lines under `money in` that are income: with payouts the engine's income includes them, so the
 * first is the Flows' own income (the exact sum of the income lines) and the second the payouts, and the
 * two add up to the engine's income. Without payouts it is the engine's income alone.
 */
export function incomeRows(
	annual: Record<string, unknown>,
	lines: readonly Record<string, unknown>[],
	currency: string,
): BlockRow[] {
	const payouts = optionalText(annual["payouts"], "payouts")
	const income = textOf(annual["income"], "income")
	if (payouts === undefined) return [{ line: "  income", amount: income }]
	const own = moneyOf(currency)(Number(sumOf(lines.map(lineOf), ["income"], currency)))
	return [
		{ line: "  income", amount: own },
		{ line: "  payouts", amount: payouts },
	]
}

/**
 * What a roll-up's transfers moved between the plan's own Accounts, under its totals: one line per
 * transfer the engine states, with what it could not move (cli ADR-0070). A Reporting span has no
 * roll-up field, so its block prints this alone, summed from the same lines.
 */
export function transferLineRows(transfers: readonly Record<string, unknown>[]): BlockRow[] {
	return transfers.flatMap((line) => {
		const name = `  ${textOf(line["flow"], "flow")}: ${textOf(line["source"], "source")} to ${textOf(line["target"], "target")}`
		const unmoved = textOf(line["unmoved"], "unmoved")
		const rows = [{ line: name, amount: textOf(line["amount"], "amount") }]
		return /^-?0+(\.0+)?$/.test(unmoved)
			? rows
			: [...rows, { line: `  ${textOf(line["flow"], "flow")}: not moved`, amount: unmoved }]
	})
}

/**
 * What the roll-up's transfers moved between the plan's own Accounts, under its totals: the engine's own
 * `transfers` figure, then one line per transfer the engine states, with what it could not move. Printed only
 * when the Scenario declares a transfer Flow, and outside the totals above it, because a transfer is no cash in or
 * out (cli ADR-0070).
 */
export function transferRows(
	annual: Record<string, unknown>,
	transfers: readonly Record<string, unknown>[],
): BlockRow[] {
	const moved = optionalText(annual["transfers"], "transfers")
	if (moved === undefined) return []
	return [
		{ line: "moved between accounts (not cash)", amount: moved },
		...transferLineRows(transfers),
	]
}

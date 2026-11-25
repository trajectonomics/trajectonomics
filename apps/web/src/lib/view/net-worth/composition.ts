import { toChartNumber } from "../../chart/number"
import type { AmountRow } from "../../contract"
import { type AccountNames, NO_NAMES, refLabel } from "../account-names"

/** One account's part of a bar: its name, the CLI's amount string, and the number its width is drawn from. */
export interface BarSegment {
	readonly label: string
	readonly amount: string
	/** Non-negative. Places the segment's width; never shown. */
	readonly value: number
}

/** The asset accounts of one currency, as the bar that divides them. */
export interface CurrencyBar {
	readonly currency: string
	readonly segments: readonly BarSegment[]
}

/**
 * The asset rows grouped by currency, in the order the CLI lists them. Each currency gets its own
 * bar, so no two currencies are divided together.
 */
export function assetBars(
	rows: readonly AmountRow[],
	names: AccountNames = NO_NAMES,
): CurrencyBar[] {
	const groups = new Map<string, BarSegment[]>()
	for (const row of rows) {
		if (row.type !== "asset") continue
		const segments = groups.get(row.currency) ?? []
		segments.push({
			label: refLabel(names, row.account),
			amount: row.amount,
			value: barWidth(row.amount),
		})
		groups.set(row.currency, segments)
	}
	return [...groups].map(([currency, segments]) => ({ currency, segments }))
}

/** The liability rows, in the order the CLI lists them, with the CLI's signed amounts. */
export function liabilityRows(rows: readonly AmountRow[]): AmountRow[] {
	return rows.filter((row) => row.type === "liability")
}

/** A balance's width in its bar. A negative asset gets no width, so the bar never goes below zero. */
function barWidth(amount: string): number {
	return Math.max(0, toChartNumber(amount))
}

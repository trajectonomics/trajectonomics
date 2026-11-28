import { lineOf, textOf } from "./cashflow-human-rows"
import { sumOf } from "./cashflow-totals"
import type { CashflowTotal } from "./cashflow-totals-view"
import { moneyOf } from "./money"

/*
 * What the two Reporting human views share (cli ADR-0086): the zero test, the partial-month note, a
 * span's totals read by section, the exact sum of a span's lines, and the span groups both views walk.
 */

export const ZERO: RegExp = /^-?0+(\.0+)?$/

export const PARTIAL_NOTE =
	"* partial: the month is cut by the As-of, the horizon or the date the money runs out."

/** One span's totals as text, by section, from its totals rows. */
export function totalsOf(
	rows: readonly Record<string, unknown>[],
): (total: CashflowTotal) => string {
	return (total) => {
		const row = rows.find((entry) => entry["total"] === total)
		if (row === undefined) throw new Error(`a Reporting span has no ${total} total`)
		return textOf(row["amount"], "amount")
	}
}

/** The exact sum of a span's lines of `groups`, at the Currency's scale. */
export function sumLines(
	lines: readonly Record<string, unknown>[],
	groups: readonly string[],
	currency: string,
): string {
	return moneyOf(currency)(Number(sumOf(lines.map(lineOf), groups, currency)))
}

/** One Reporting span's nine totals rows, and the days it covers. */
export type SpanGroup = {
	year: number
	from: string
	to: string
	partial: boolean
	rows: Record<string, unknown>[]
}

export function groupsOf(totals: readonly Record<string, unknown>[]): SpanGroup[] {
	const groups = new Map<number, SpanGroup>()
	for (const row of totals) {
		const year = Number(row["year"])
		const found = groups.get(year)
		if (found !== undefined) {
			found.rows.push(row)
			continue
		}
		groups.set(year, {
			year,
			from: textOf(row["from"], "from"),
			to: textOf(row["to"], "to"),
			partial: row["partial"] === true,
			rows: [row],
		})
	}
	return [...groups.values()]
}

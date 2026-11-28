import { blockLines } from "../table/lines"
import { BLOCK_COLUMNS, tableRows } from "./cashflow-human"
import { type BlockRow, textOf, transferLineRows } from "./cashflow-human-rows"
import { groupsOf, type SpanGroup, sumLines, totalsOf, ZERO } from "./cashflow-span-support"
import { minorOf } from "./cashflow-totals"
import type { CashflowTotal } from "./cashflow-totals-view"
import { moneyOf } from "./money"

/*
 * `--breakdown-years`'s human view (cli ADR-0086): one block per Reporting year, its sections each under
 * the one it belongs to, then what moved outside the household's cash.
 */

/** The rows above a year block's transfers: its sections, each under the one it belongs to (ADR-0086). */
function yearRows(
	lines: readonly Record<string, unknown>[],
	amountOf: (total: CashflowTotal) => string,
	currency: string,
): BlockRow[] {
	const groupLines = (group: string) => lines.filter((line) => line["group"] === group)
	const has = (group: string) => groupLines(group).length > 0
	const rows: BlockRow[] = [
		{ line: "money in", amount: amountOf("money in") },
		{ line: "  income", amount: sumLines(lines, ["income"], currency) },
	]
	if (has("payout")) rows.push({ line: "  payouts", amount: sumLines(lines, ["payout"], currency) })
	if (has("withdrawal")) rows.push({ line: "  withdrawals", amount: amountOf("withdrawals") })
	if (has("drawn")) rows.push({ line: "  drawn", amount: amountOf("drawn") })
	if (has("prepaid") || has("settlement")) rows.push({ line: "tax", amount: amountOf("tax") })
	rows.push({ line: "spending", amount: amountOf("spending") })
	for (const line of groupLines("category")) {
		const name = line["id"] === null ? "(uncategorised)" : String(line["id"])
		rows.push({ line: `  ${name}`, amount: textOf(line["amount"], "amount") })
	}
	rows.push({ line: "saving", amount: amountOf("saving") })
	if (!ZERO.test(amountOf("not funded"))) {
		rows.push({ line: "not funded", amount: amountOf("not funded") })
	}
	rows.push({ line: "left over", amount: amountOf("left over") })
	if (!ZERO.test(amountOf("unmet"))) rows.push({ line: "unmet", amount: amountOf("unmet") })
	return rows
}

/** What moved outside the household's cash: the span's transfers, then an employer's share. */
function outsideRows(
	lines: readonly Record<string, unknown>[],
	transfers: readonly Record<string, unknown>[],
	currency: string,
): BlockRow[] {
	const rows: BlockRow[] = []
	if (transfers.length > 0) {
		const moved = transfers.reduce(
			(total, row) => total + minorOf(textOf(row["amount"], "amount"), currency),
			0n,
		)
		rows.push({
			line: "moved between accounts (not cash)",
			amount: moneyOf(currency)(Number(moved)),
		})
		rows.push(...transferLineRows(transfers))
	}
	if (lines.some((line) => line["group"] === "employer")) {
		rows.push({
			line: "employer paid in (not cash)",
			amount: sumLines(lines, ["employer"], currency),
		})
	}
	return rows
}

/** One block per Reporting year, or nothing when no year was reported. */
export function yearBlocks(data: Record<string, unknown>, currency: string): string[] {
	const totals = tableRows(data, "cashflowYearTotals")
	if (totals === undefined || totals.length === 0) return []
	const lines = tableRows(data, "cashflowYears") ?? []
	const transfers = tableRows(data, "cashflowYearTransfers") ?? []
	return groupsOf(totals).map((span: SpanGroup) => {
		const spanLines = lines.filter((line) => Number(line["year"]) === span.year)
		const spanTransfers = transfers.filter((line) => Number(line["year"]) === span.year)
		const rows = [
			...yearRows(spanLines, totalsOf(span.rows), currency),
			...outsideRows(spanLines, spanTransfers, currency),
		]
		const heading = `cash flow ${span.year}, ${span.from} to ${span.to}${span.partial ? " (partial)" : ""}`
		return blockLines(heading, rows, BLOCK_COLUMNS)
	})
}

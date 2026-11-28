/** Shared expectations for the Reporting breakdown tests: spans, line groups and yearly bounds. */
import type { CashflowLines, ReportingCashflow } from "../types"

/** An expected Reporting span with every list empty unless named. */
export function span(
	year: number,
	from: string,
	to: string,
	partial: boolean,
	over: Partial<CashflowLines> = {},
): ReportingCashflow {
	return {
		year,
		from,
		to,
		partial,
		income: [],
		prepaid: [],
		settlements: [],
		expenses: [],
		categories: [],
		contributions: [],
		withdrawals: [],
		drawn: [],
		surplus: [],
		unmet: 0,
		...over,
	}
}

/** Every line of one breakdown, keyed by group and id, zero amounts dropped. */
export function lineSums(line: CashflowLines): Map<string, number> {
	const pair = (key: string, amount: number): readonly [string, number] => [key, amount]
	const pairs = [
		...line.income.map((item) => pair(`income:${item.flow}`, item.amount)),
		...(line.payouts ?? []).map((item) => pair(`payouts:${item.account}`, item.amount)),
		...line.prepaid.map((item) => pair(`prepaid:${item.levy}`, item.amount)),
		...line.settlements.map((item) => pair(`settlements:${item.levy}`, item.amount)),
		...line.expenses.map((item) => pair(`expenses:${item.flow}`, item.amount)),
		...line.categories.map((item) => pair(`categories:${String(item.category)}`, item.amount)),
		...line.contributions.flatMap((item) => [
			pair(`applied:${item.flow}`, item.applied),
			pair(`unfunded:${item.flow}`, item.unfunded),
		]),
		...(line.employer ?? []).map((item) => pair(`employer:${item.flow}`, item.amount)),
		...line.withdrawals.map((item) => pair(`withdrawals:${item.flow}`, item.amount)),
		...(line.transfers ?? []).flatMap((item) => [
			pair(`transfers:${item.flow}`, item.amount),
			pair(`unmoved:${item.flow}`, item.unmoved),
		]),
		...line.drawn.map((item) => pair(`drawn:${item.account}`, item.amount)),
		...line.surplus.map((item) => pair(`surplus:${item.account}`, item.amount)),
		pair("unmet", line.unmet),
	]
	const sums = new Map<string, number>()
	for (const [key, amount] of pairs) {
		if (amount !== 0) sums.set(key, (sums.get(key) ?? 0) + amount)
	}
	return sums
}

/** The sum of every line group over `lines`. */
export function totalSums(lines: readonly CashflowLines[]): Map<string, number> {
	const total = new Map<string, number>()
	for (const line of lines) {
		for (const [key, amount] of lineSums(line)) total.set(key, (total.get(key) ?? 0) + amount)
	}
	return total
}

/** The sum of one line list's amounts. */
export function totalOf(lines: readonly { readonly amount: number }[]): number {
	return lines.reduce((sum, line) => sum + line.amount, 0)
}
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function lastDayOf(year: number, month: number): number {
	return month === 2 && isLeapYear(year) ? 29 : (MONTH_DAYS[month - 1] ?? 0)
}

function pad(value: number, width: number): string {
	return String(value).padStart(width, "0")
}

/** The nominal first and last day of Reporting year `year`, by plain calendar arithmetic. */
export function yearBounds(
	year: number,
	yearStart: number,
): { readonly from: string; readonly to: string } {
	const lastYear = yearStart === 1 ? year : year + 1
	const lastMonth = yearStart === 1 ? 12 : yearStart - 1
	return {
		from: `${pad(year, 4)}-${pad(yearStart, 2)}-01`,
		to: `${pad(lastYear, 4)}-${pad(lastMonth, 2)}-${pad(lastDayOf(lastYear, lastMonth), 2)}`,
	}
}

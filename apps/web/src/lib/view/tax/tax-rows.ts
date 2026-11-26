import type { TaxYear } from "../../contract"
import { formatDate } from "../../format"

/** One Levy settlement period as the table shows it: its dates, its figures and its two marks. */
export interface TaxRow {
	readonly key: string
	readonly levy: string
	/** The Filer whose Return this period is, for a separate filing; null when the plan keeps one Return. */
	readonly filer: string | null
	readonly period: string
	readonly settles: string
	readonly due: string
	readonly prepaid: string
	readonly owed: string
	/** A negative owed is a refund, which the page says in words. */
	readonly refund: boolean
	readonly settled: boolean
	readonly partial: boolean
}

/** The first tax year as the headline states it: what is owed, its period and its settlement date. */
export interface TaxHeadline {
	readonly levy: string
	readonly owed: string
	readonly refund: boolean
	readonly period: string
	readonly settles: string
}

const ZERO = /^-?0+(\.0+)?$/

/** Whether an owed figure is a refund: negative and not zero. Only the sign is read. */
export function isRefund(owed: string): boolean {
	return owed.startsWith("-") && !ZERO.test(owed)
}

/** The period of a tax year as a date range, such as "1 Jan 2026 to 31 Dec 2026". */
export function periodOf(year: TaxYear): string {
	return `${formatDate(year.from)} to ${formatDate(year.to)}`
}

/** One row per tax year, in the order the CLI states them. */
export function taxRows(years: readonly TaxYear[]): readonly TaxRow[] {
	return years.map((year) => ({
		key: `${year.levy}-${year.from}`,
		levy: year.levy,
		filer: year.filer ?? null,
		period: periodOf(year),
		settles: formatDate(year.settlementDate),
		due: year.due,
		prepaid: year.prepaid,
		owed: year.owed,
		refund: isRefund(year.owed),
		settled: year.settled,
		partial: year.partial,
	}))
}

/** The headline of the first tax year, or null when the Scenario has no tax year. */
export function taxHeadline(years: readonly TaxYear[]): TaxHeadline | null {
	const first = years[0]
	if (!first) return null
	return {
		levy: first.levy,
		owed: first.owed,
		refund: isRefund(first.owed),
		period: periodOf(first),
		settles: formatDate(first.settlementDate),
	}
}

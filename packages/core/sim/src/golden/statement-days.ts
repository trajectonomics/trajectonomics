import { addDays } from "../calendar/arith"
import { daysInMonth, isLeapYear, parseDate } from "../calendar/civil"
import type { CompoundingPeriod } from "../types"
import type { OracleDay } from "./oracle-statement"

const MONTHS_PER_PERIOD: Readonly<Record<CompoundingPeriod, number>> = {
	monthly: 1,
	quarterly: 3,
	semiannual: 6,
	annual: 12,
}

/** Counted days of the whole compounding period holding `month`: its calendar days less its Feb 29. */
function countedDaysOfPeriod(year: number, month: number, period: CompoundingPeriod): number {
	const width = MONTHS_PER_PERIOD[period]
	const first = year * 12 + (month - 1) - ((month - 1) % width)
	let days = 0
	for (let index = first; index < first + width; index++) {
		const y = Math.floor(index / 12)
		const m = (index % 12) + 1
		days += daysInMonth(y, m) - (m === 2 && isLeapYear(y) ? 1 : 0)
	}
	return days
}

/**
 * Each calendar day from `from` to `to` inclusive, with the amounts that land on it. A day's
 * denominator is the one its compounding period gives, and its compounding date is the period's
 * last day; its statement month ends on the last day of a calendar month, or on `to`.
 */
export function calendarDays(
	from: string,
	to: string,
	lands: {
		readonly drawn?: (date: string) => bigint
		readonly planned?: (date: string) => bigint
	} = {},
	compounding: CompoundingPeriod = "monthly",
): OracleDay[] {
	const days: OracleDay[] = []
	const width = MONTHS_PER_PERIOD[compounding]
	for (let date = from; date <= to; date = addDays(date, 1)) {
		const { year, month, day } = parseDate(date)
		const monthDays = daysInMonth(year, month)
		const periodEnd = month % width === 0 && day === monthDays
		days.push({
			date,
			denominator:
				10_000n * BigInt(12 / width) * BigInt(countedDaysOfPeriod(year, month, compounding)),
			counted: !(month === 2 && day === 29),
			compoundEnd: periodEnd,
			statementEnd: day === monthDays || date === to,
			drawn: lands.drawn?.(date) ?? 0n,
			planned: lands.planned?.(date) ?? 0n,
		})
	}
	return days
}

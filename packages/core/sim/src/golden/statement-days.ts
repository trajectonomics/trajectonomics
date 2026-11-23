import { addDays } from "../calendar/arith"
import { daysInMonth, parseDate } from "../calendar/civil"
import type { OracleDay } from "./oracle-statement"

/** Each calendar day from `from` to `to` inclusive, with the amounts that land on it. */
export function calendarDays(
	from: string,
	to: string,
	lands: {
		readonly drawn?: (date: string) => bigint
		readonly planned?: (date: string) => bigint
	} = {},
): OracleDay[] {
	const days: OracleDay[] = []
	for (let date = from; date <= to; date = addDays(date, 1)) {
		const { year, month, day } = parseDate(date)
		const monthDays = daysInMonth(year, month)
		const monthEnd = day === monthDays
		days.push({
			date,
			monthDays,
			monthEnd,
			periodEnd: monthEnd || date === to,
			drawn: lands.drawn?.(date) ?? 0n,
			planned: lands.planned?.(date) ?? 0n,
		})
	}
	return days
}

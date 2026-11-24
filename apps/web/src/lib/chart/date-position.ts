/**
 * One row of a chart whose x axis is years: its index, which is where its point is drawn (the close of
 * the row), and the first and last day the row covers, as YYYY-MM-DD.
 */
export interface DaySpan {
	readonly index: number
	readonly from: string
	readonly to: string
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The x position of a day among the spans. A span's point sits at its index, its close. The span before
 * closed at index - 1, so a day lies between the two: a day is placed at the end of itself, so the last
 * day of a span is exactly its close. Null when no span holds the day. Days are counted as whole
 * numbers, never as a Date.
 */
export function dayPosition(spans: readonly DaySpan[], day: string): number | null {
	for (const span of spans) {
		if (day < span.from || day > span.to) continue
		const start = dayNumber(span.from)
		const length = dayNumber(span.to) - start + 1
		return span.index - 1 + (dayNumber(day) - start + 1) / length
	}
	return null
}

/** The number of days from 1970-01-01 to a calendar day (proleptic Gregorian), by integer arithmetic. It places a date on a time axis. */
export function dayNumber(date: string): number {
	const match = DAY.exec(date)
	if (!match) throw new RangeError(`not a YYYY-MM-DD date: ${date}`)
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const shifted = month <= 2 ? year - 1 : year
	const era = Math.floor(shifted / 400)
	const yearOfEra = shifted - era * 400
	const monthOfYear = (month + 9) % 12
	const dayOfYear = Math.floor((153 * monthOfYear + 2) / 5) + day - 1
	const dayOfEra =
		yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
	return era * 146097 + dayOfEra - 719468
}

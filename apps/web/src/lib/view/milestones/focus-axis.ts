const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** The month's index of a YYYY-MM-DD date: year * 12 + month - 1. It places a day on a time axis. */
export function monthIndex(date: string): number {
	const match = DATE.exec(date)
	if (match === null) throw new RangeError(`not a YYYY-MM-DD date: ${date}`)
	return Number(match[1]) * 12 + Number(match[2]) - 1
}

/**
 * How far a day lies along the timeline from one date to another, from 0 to 1, so a pin is drawn at the
 * month it falls in. Only a position: nothing here is shown. A timeline with one month places every day at 0.
 */
export function dateShare(from: string, to: string, day: string): number {
	const start = monthIndex(from)
	const end = monthIndex(to)
	if (end <= start) return 0
	return Math.min(1, Math.max(0, (monthIndex(day) - start) / (end - start)))
}

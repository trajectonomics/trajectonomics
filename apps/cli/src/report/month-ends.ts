/** Whether a Gregorian year is a leap year. */
function isLeap(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** The last day of a month, as `YYYY-MM-DD`. */
function monthEnd(year: number, month: number): string {
	const days = month === 2 ? (isLeap(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31
	return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${days}`
}

/**
 * The month-ends from one date to another, both inclusive: each month's last day that is on or
 * after `since` and on or before `until`, oldest first. Both dates are already checked real
 * `YYYY-MM-DD` dates, so a plain string comparison orders them.
 */
export function monthEndsBetween(since: string, until: string): string[] {
	const ends: string[] = []
	let year = Number(since.slice(0, 4))
	let month = Number(since.slice(5, 7))
	const lastYear = Number(until.slice(0, 4))
	const lastMonth = Number(until.slice(5, 7))
	while (year < lastYear || (year === lastYear && month <= lastMonth)) {
		const last = monthEnd(year, month)
		if (last >= since && last <= until) ends.push(last)
		month += 1
		if (month > 12) {
			month = 1
			year += 1
		}
	}
	return ends
}

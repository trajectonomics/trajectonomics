/** The number of UTC days the overview shows. */
export const WINDOW_DAYS = 30

/** One inclusive run of UTC days, oldest first. */
export type DayWindow = {
	from: string
	to: string
	days: readonly string[]
}

const DAY_MS = 86_400_000
const DAY = /^\d{4}-\d{2}-\d{2}$/

/** Whether the value is a real UTC calendar day in `YYYY-MM-DD` form. */
export function isDay(value: string): boolean {
	if (!DAY.test(value)) return false
	const ms = Date.parse(`${value}T00:00:00.000Z`)
	return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value
}

/** The UTC day a clock reading falls in. */
export function utcDay(nowMs: number): string {
	return new Date(nowMs).toISOString().slice(0, 10)
}

/** The inclusive window ending on `to`, oldest day first. */
export function lastDays(to: string, count = WINDOW_DAYS): DayWindow {
	if (!isDay(to)) throw new Error(`lastDays: "${to}" is not a UTC day`)
	if (!Number.isInteger(count) || count < 1) {
		throw new Error(`lastDays: count must be a positive integer, got ${count}`)
	}
	const end = Date.parse(`${to}T00:00:00.000Z`)
	const days = Array.from({ length: count }, (_, index) =>
		new Date(end - (count - 1 - index) * DAY_MS).toISOString().slice(0, 10),
	)
	return { from: days[0] ?? to, to, days }
}

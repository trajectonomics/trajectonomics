import { type DayWindow, daysBetween, isDay, lastDays } from "./window"

/** The Log's period keys, in the order the picker shows them. */
export type PeriodKey = "1d" | "3d" | "7d" | "wtd" | "mtd" | "30d" | "90d"

/** How the Log groups a period's tokens. */
export type BucketKind = "hour" | "day" | "week"

/** One picker choice: its label, the buckets it can fill and the one it opens on. */
export type Period = {
	key: PeriodKey
	label: string
	buckets: readonly BucketKind[]
	defaultBucket: BucketKind
}

/** The periods in the picker's order. Every hour-capable one fits the hourly read's week. */
export const PERIODS: readonly Period[] = [
	{ key: "1d", label: "1D", buckets: ["hour"], defaultBucket: "hour" },
	{ key: "3d", label: "3D", buckets: ["hour", "day"], defaultBucket: "hour" },
	{ key: "7d", label: "1W", buckets: ["hour", "day"], defaultBucket: "day" },
	{ key: "wtd", label: "This week", buckets: ["hour", "day"], defaultBucket: "day" },
	{ key: "mtd", label: "This month", buckets: ["day", "week"], defaultBucket: "day" },
	{ key: "30d", label: "1M", buckets: ["day", "week"], defaultBucket: "day" },
	{ key: "90d", label: "3M", buckets: ["day", "week"], defaultBucket: "week" },
]

/** The bucket choices in the picker's order. */
export const BUCKETS: readonly { key: BucketKind; label: string }[] = [
	{ key: "hour", label: "Hour" },
	{ key: "day", label: "Day" },
	{ key: "week", label: "Week" },
]

/** The period the page opens on, which is today's 30-day view. */
export const DEFAULT_PERIOD: PeriodKey = "30d"

const DAY_MS = 86_400_000

/** Whether a query value names a period. */
export function isPeriodKey(value: string): value is PeriodKey {
	return PERIODS.some((period) => period.key === value)
}

/** Whether a query value names a bucket. */
export function isBucketKind(value: string): value is BucketKind {
	return BUCKETS.some((bucket) => bucket.key === value)
}

/** One period's entry; a key outside the table is a programming error. */
export function periodEntry(key: PeriodKey): Period {
	const entry = PERIODS.find((period) => period.key === key)
	if (entry === undefined) throw new Error(`periodEntry: unknown period "${key}"`)
	return entry
}

/** The bucket a period shows: the wanted one when it allows it, else its own default. */
export function resolveBucket(key: PeriodKey, wanted: BucketKind | null): BucketKind {
	const period = periodEntry(key)
	return wanted !== null && period.buckets.includes(wanted) ? wanted : period.defaultBucket
}

/** The first day of the ISO week `day` falls in; ISO weeks start on Monday, UTC. */
export function mondayOf(day: string): string {
	const ms = Date.parse(`${day}T00:00:00.000Z`)
	const offset = (new Date(ms).getUTCDay() + 6) % 7
	return new Date(ms - offset * DAY_MS).toISOString().slice(0, 10)
}

/** The period's inclusive window ending on `to`, oldest day first, weeks starting Monday. */
export function periodWindow(key: PeriodKey, to: string): DayWindow {
	if (!isDay(to)) throw new Error(`periodWindow: "${to}" is not a UTC day`)
	if (key === "1d") return lastDays(to, 1)
	if (key === "3d") return lastDays(to, 3)
	if (key === "7d") return lastDays(to, 7)
	if (key === "30d") return lastDays(to, 30)
	if (key === "90d") return lastDays(to, 90)
	const first = key === "wtd" ? mondayOf(to) : `${to.slice(0, 8)}01`
	return lastDays(to, daysBetween(first, to) + 1)
}

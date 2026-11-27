/** One row of the usage API; it carries no machine, contributor or hour. */
export type UsageRow = {
	day: string
	plan: string
	model: string
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	tokensTotal: number
	requests: number
	granularity: "hour" | "day"
	bestEffort: boolean
}

/** The body of the usage API. */
export type UsagePayload = {
	asOf: string
	methodVersion: number
	series: string
	rows: UsageRow[]
}

/** The body of the health API. */
export type Health = {
	lastIngestAt: string | null
	minutesSinceIngest: number | null
	stale: boolean
}

/** The most tokens one plan used in a window, and the UTC day the window starts. */
export type Peak = {
	tokens: number
	fromDay: string
}

/** The three windows, as the peaks API names them. */
export type PeakWindowKey = "fiveHours" | "sevenDays" | "thirtyDays"

/** One tier's peaks, as the peaks API measured them. */
export type MeasuredTier = {
	tier: string | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
}

/** One plan's three peaks, the tier they belong to, and every tier we measured. */
export type PlanPeak = {
	plan: string
	tier: string | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
	measured: MeasuredTier[]
}

/** The body of the peaks API. */
export type PeaksPayload = {
	asOf: string
	methodVersion: number
	plans: PlanPeak[]
}

/** A day's token total for one plan, as the chart plots it. */
export type ChartPoint = {
	day: string
	tokens: number
}

/** One plan's line over the window. */
export type ChartSeries = {
	plan: string
	name: string
	total: number
	points: ChartPoint[]
}

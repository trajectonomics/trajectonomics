/** One row of `GET /api/usage`; it carries no machine, contributor or hour. */
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

/** The body of `GET /api/usage`. */
export type UsagePayload = {
	asOf: string
	methodVersion: number
	series: string
	rows: UsageRow[]
}

/** The body of `GET /api/health`. */
export type Health = {
	lastIngestAt: string | null
	minutesSinceIngest: number | null
	stale: boolean
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

import type { Collector } from "../core/collectors"
import type { Meter } from "../core/meters"

export type { Collector, Meter }

/** The body of the signed-in collectors read. */
export type CollectorsPayload = {
	collectors: Collector[]
	meters: Meter[]
}

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

/** The body of the health API; an older cached body has neither collected-day field. */
export type Health = {
	lastIngestAt: string | null
	minutesSinceIngest: number | null
	stale: boolean
	/** The first UTC day collection is known to cover. */
	collectingSince?: string | null
	/** The first collected UTC day per plan. */
	planSince?: Record<string, string>
}

/**
 * The most tokens one plan used in a window, and the UTC day the window starts. `cacheRead` is
 * absent from a peaks body cached before shape 3, and `derived` marks a 30-day figure that is the
 * week × 30/7 because the vendor states no monthly window.
 */
export type Peak = {
	tokens: number
	fromDay: string
	cacheRead?: number | null
	derived?: boolean
}

/** The three windows, as the peaks API names them. */
export type PeakWindowKey = "fiveHours" | "sevenDays" | "thirtyDays"

/** One measure's 100% figure and the range its rounded meter readings allow. */
export type Measure = { value: number; low: number; high: number | null }

/**
 * One window's estimated 100% from the plan's usage meter. `tokens` is the uncached measure,
 * `processed` counts cache reads in full and `usd` prices every kind at its model's list price;
 * the last two are absent from a body cached before shape 5. `rough` marks fewer than three points
 * of meter movement or less than a day of it, and `derived` marks a 30-day figure that is the
 * week × 30/7.
 */
export type Limit = {
	tokens: number
	low: number
	high: number | null
	processed?: Measure
	usd?: Measure | null
	points: number
	readings: number
	rough: boolean
	derived?: boolean
}

/** A plan's three limit estimates; a window with no meter movement has none. */
export type Limits = {
	fiveHours: Limit | null
	sevenDays: Limit | null
	thirtyDays: Limit | null
}

/** One tier's peaks, as the peaks API measured them. */
export type MeasuredTier = {
	tier: string | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
	/** The current tier's meter estimates; null on every other tier and on an old body. */
	limits?: Limits | null
}

/** One plan's three peaks, the tier they belong to, and every tier we measured. */
export type PlanPeak = {
	plan: string
	tier: string | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
	limits?: Limits | null
	measured: MeasuredTier[]
}

/** The body of the peaks API. */
export type PeaksPayload = {
	asOf: string
	methodVersion: number
	plans: PlanPeak[]
}

/** A bucket's token total for one plan, as the chart plots it; `label` is what it prints. */
export type ChartPoint = {
	label: string
	tokens: number
}

/** One plan's line over the window. */
export type ChartSeries = {
	plan: string
	name: string
	total: number
	points: ChartPoint[]
}

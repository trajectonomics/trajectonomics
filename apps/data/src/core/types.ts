import type { Granularity, UsageRow } from "@trajectonomics/data-collector/types"

/** The quota windows a plan can publish. */
export type QuotaWindow = "five_hour" | "weekly" | "monthly"

/** One observed quota percentage for a plan window at a UTC hour. */
export type QuotaSample = {
	contributor: UsageRow["contributor"]
	plan: string
	window: QuotaWindow
	sampledAt: string
	usedPct: number
	resetsAt: string | null
}

/** The series the pilot publishes; community series arrive with the community work. */
export type Series = "measured-by-us"

/** An authenticated sender and the series its rows belong to. */
export type Principal = {
	contributorId: UsageRow["contributor"]
	series: Series
}

/** A validated ingest body, with the contributor taken from the key. */
export type IngestBatch = {
	contributorId: UsageRow["contributor"]
	series: Series
	usage: readonly UsageRow[]
	quota: readonly QuotaSample[]
}

/** The fields a rollup needs from a usage row. */
export type UsageForRollup = Pick<
	UsageRow,
	| "plan"
	| "model"
	| "hourUtc"
	| "granularity"
	| "tokensIn"
	| "tokensOut"
	| "cacheRead"
	| "cacheWrite"
	| "tokensTotal"
	| "requests"
	| "bestEffort"
>

/** One day's totals for one plan and model in one series. */
export type RollupRow = {
	series: string
	day: string
	plan: string
	model: string
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	tokensTotal: number
	requests: number
	granularity: Granularity
	bestEffort: boolean
}

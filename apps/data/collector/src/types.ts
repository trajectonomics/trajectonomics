/** The bucket width a row uses: hour for API sources, day for the Mistral console export. */
export type Granularity = "hour" | "day"

/** One machine's usage for one plan, model and UTC bucket. */
export type UsageRow = {
	contributor: "trajectonomics"
	machine: string
	plan: string
	model: string
	/** ISO timestamp at the start of the UTC hour, or of the UTC day when `granularity` is `day`. */
	hourUtc: string
	granularity: Granularity
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	tokensTotal: number
	requests: number
	source: string
	bestEffort: boolean
}

/** One usage observation, before it is bucketed and summed. */
export type UsageSample = {
	plan: string
	model: string
	timestamp: string | number
	granularity?: Granularity
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	/** Set only when the source reports a total that is not the sum of the four parts. */
	tokensTotal?: number
	requests: number
	source: string
	bestEffort?: boolean
}

/** Who the rows belong to; every emitted row carries the contributor. */
export type CollectorContext = {
	contributor: "trajectonomics"
	machine: string
}

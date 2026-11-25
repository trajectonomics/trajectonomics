import type { Health } from "./types"

/** The freshness line and its neutral note, when the pipeline is stale. */
export type Freshness = {
	label: string
	note: string | null
}

/** Builds the freshness label from the health endpoint's report. */
export function freshness(health: Health): Freshness {
	const minutes = health.minutesSinceIngest
	if (minutes === null) {
		return {
			label: "No ingest recorded yet",
			note: health.stale ? "The data may be behind." : null,
		}
	}
	const unit = minutes === 1 ? "minute" : "minutes"
	return {
		label: `Last updated ${minutes} ${unit} ago`,
		note: health.stale ? "The data may be behind the latest ingest." : null,
	}
}

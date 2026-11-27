import type { Health } from "./types"

/** The note shown when uploads are paused. */
const STALE_NOTE = "Uploads are paused, so the figures stop at the last update."

/** The freshness line, its absolute time, and its neutral note when the pipeline is stale. */
export type Freshness = {
	label: string
	/** The last ingest as `YYYY-MM-DD HH:MM UTC`, or null when none is recorded. */
	at: string | null
	note: string | null
}

/** Builds the freshness line from the health endpoint's report. */
export function freshness(health: Health): Freshness {
	const note = health.stale ? STALE_NOTE : null
	if (health.minutesSinceIngest === null) {
		return { label: "No ingest recorded yet", at: absoluteTime(health.lastIngestAt), note }
	}
	const minutes = Math.max(0, Math.floor(health.minutesSinceIngest))
	return {
		label: `Last updated ${humanAge(minutes)} ago`,
		at: absoluteTime(health.lastIngestAt),
		note,
	}
}

/** An age in minutes as minutes under an hour, hours under two days, then days. */
function humanAge(minutes: number): string {
	if (minutes < 60) return count(minutes, "minute")
	if (minutes < 48 * 60) return count(Math.floor(minutes / 60), "hour")
	return count(Math.floor(minutes / 1440), "day")
}

function count(value: number, unit: string): string {
	return `${value} ${unit}${value === 1 ? "" : "s"}`
}

/** The first minute of an ISO timestamp, without a clock: a pure slice of the API's string. */
function absoluteTime(iso: string | null): string | null {
	if (iso === null || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) return null
	return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

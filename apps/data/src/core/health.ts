/** The UTC days collection covers, as day aggregates only: never an hour, machine or contributor. */
export type CollectingDays = {
	/** The first UTC day the series holds a rollup for, or null when it holds none. */
	collectingSince: string | null
	/** The first UTC day each plan holds a rollup for. */
	planSince: Record<string, string>
}

/** A series with no rows: nothing has been collected. */
export const NOTHING_COLLECTED: CollectingDays = Object.freeze({
	collectingSince: null,
	planSince: {},
})

/** The freshness report the health endpoint and the cron tick share. */
export type Health = CollectingDays & {
	lastIngestAt: string | null
	minutesSinceIngest: number | null
	stale: boolean
}

/** How long without an ingest makes the pipeline stale. */
export const STALE_AFTER_MINUTES = 180

/** Builds the health report from the last ingest time, the collected days and the clock. */
export function healthReport(
	lastIngestAt: string | null,
	nowMs: number,
	collected: CollectingDays = NOTHING_COLLECTED,
): Health {
	const days = {
		collectingSince: collected.collectingSince,
		planSince: collected.planSince,
	}
	if (lastIngestAt === null) {
		return { ...days, lastIngestAt: null, minutesSinceIngest: null, stale: true }
	}
	const ms = Date.parse(lastIngestAt)
	if (Number.isNaN(ms)) {
		return { ...days, lastIngestAt: null, minutesSinceIngest: null, stale: true }
	}
	const minutes = Math.max(0, Math.floor((nowMs - ms) / 60_000))
	return {
		...days,
		lastIngestAt,
		minutesSinceIngest: minutes,
		stale: minutes > STALE_AFTER_MINUTES,
	}
}

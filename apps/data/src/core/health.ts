/** The freshness report the health endpoint and the cron tick share. */
export type Health = {
	lastIngestAt: string | null
	minutesSinceIngest: number | null
	stale: boolean
}

/** How long without an ingest makes the pipeline stale. */
export const STALE_AFTER_MINUTES = 180

/** Builds the health report from the last ingest time and the caller's clock. */
export function healthReport(lastIngestAt: string | null, nowMs: number): Health {
	if (lastIngestAt === null) {
		return { lastIngestAt: null, minutesSinceIngest: null, stale: true }
	}
	const ms = Date.parse(lastIngestAt)
	if (Number.isNaN(ms)) {
		return { lastIngestAt: null, minutesSinceIngest: null, stale: true }
	}
	const minutes = Math.max(0, Math.floor((nowMs - ms) / 60_000))
	return { lastIngestAt, minutesSinceIngest: minutes, stale: minutes > STALE_AFTER_MINUTES }
}

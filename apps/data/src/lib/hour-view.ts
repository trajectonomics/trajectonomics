import type { HourlyRow } from "./hourly-types"
import { comparePlans, planName } from "./plans"
import type { UsageRow } from "./types"

/**
 * The plans that report whole days and have no hourly row, in the plan table's order. A plan with
 * hourly rows has a line even when one of its sources reports days, so the note leaves it out.
 */
export function dayOnlyPlans(rows: readonly UsageRow[], hourly: readonly HourlyRow[]): string[] {
	const hasHours = new Set(hourly.map((row) => row.plan))
	const plans = new Set(
		rows
			.filter((row) => row.granularity === "day" && !hasHours.has(row.plan))
			.map((row) => row.plan),
	)
	return [...plans].sort((a, b) => comparePlans({ plan: a }, { plan: b })).map(planName)
}

/** The start of the UTC hour an instant falls in, in the API's spelling. */
function floorHour(instant: string): string {
	return `${new Date(Date.parse(instant)).toISOString().slice(0, 13)}:00:00.000Z`
}

/**
 * The last hour the hour view plots on a window that ends today: the current hour, or the last
 * ingest's hour when that is earlier, so hours no collector has reported yet are not drawn as zero.
 */
export function lastKnownHour(now: string, lastIngestAt: string | null | undefined): string {
	const current = floorHour(now)
	if (
		lastIngestAt === null ||
		lastIngestAt === undefined ||
		Number.isNaN(Date.parse(lastIngestAt))
	) {
		return current
	}
	const ingest = floorHour(lastIngestAt)
	return Date.parse(ingest) < Date.parse(current) ? ingest : current
}

/** The hour view's one-line note about day-only plans, or null when there are none. */
export function dayOnlyNote(names: readonly string[]): string | null {
	if (names.length === 0) return null
	const who =
		names.length === 1
			? names[0]
			: `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
	return names.length === 1
		? `${who} reports whole days, so it has no hourly line.`
		: `${who} report whole days, so they have no hourly line.`
}

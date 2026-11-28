import { QUOTA_PLANS } from "@trajectonomics/data-collector/quota-plans"

/** How old a meter reading may be and still count as fresh: two missed hourly runs. */
export const METER_FRESH_MS = 3 * 3_600_000

/** One plan's newest quota reading, as the session read returns it. */
export type MeterReadingRow = { plan: string; last_sampled_at: string }

/** One plan with usage rows inside the recent-use window. */
export type RecentPlanRow = { plan: string }

/** Whether a metered plan's last reading is fresh, stale, or has never happened. */
export type MeterState = "fresh" | "stale" | "missing"

/** One metered plan on the Usage meters panel; it carries no percentage, reset or contributor. */
export type Meter = {
	plan: string
	lastReadingAt: string | null
	state: MeterState
}

const STATE_ORDER: Readonly<Record<MeterState, number>> = Object.freeze({
	stale: 0,
	missing: 1,
	fresh: 2,
})

const METERED = new Set<string>(QUOTA_PLANS)

function readingState(lastSampledAt: string, nowMs: number): MeterState {
	const at = Date.parse(lastSampledAt)
	// An unreadable time is not evidence of a fresh reading, so it counts as stale.
	if (Number.isNaN(at)) return "stale"
	return nowMs - at < METER_FRESH_MS ? "fresh" : "stale"
}

function newest(readings: readonly MeterReadingRow[]): Map<string, string> {
	const latest = new Map<string, string>()
	for (const row of readings) {
		if (!METERED.has(row.plan)) continue
		const current = latest.get(row.plan)
		if (current === undefined || row.last_sampled_at > current) {
			latest.set(row.plan, row.last_sampled_at)
		}
	}
	return latest
}

/**
 * The Usage meters panel's rows: every metered plan with a reading or recent use, stale first, then
 * missing, then fresh, ties by plan id. A plan with neither a reading nor recent use is left out.
 */
export function metersView(
	readings: readonly MeterReadingRow[],
	recentPlans: readonly RecentPlanRow[],
	nowMs: number,
): Meter[] {
	const latest = newest(readings)
	const recent = new Set(recentPlans.map((row) => row.plan).filter((plan) => METERED.has(plan)))
	const meters: Meter[] = []
	for (const plan of QUOTA_PLANS) {
		const lastReadingAt = latest.get(plan)
		if (lastReadingAt !== undefined) {
			meters.push({ plan, lastReadingAt, state: readingState(lastReadingAt, nowMs) })
		} else if (recent.has(plan)) {
			meters.push({ plan, lastReadingAt: null, state: "missing" })
		}
	}
	return meters.sort(
		(a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.plan.localeCompare(b.plan),
	)
}

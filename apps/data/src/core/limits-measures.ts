import { hoursBetween } from "./limits-readings"
import type { MeterHour } from "./meter-hours"

/** One measure's 100% figure and the range its rounded meter readings allow. */
export type Measure = { value: number; low: number; high: number | null }

/** The three measures over the hours between two readings; a missing hour contributes zero. */
export function sumsBetween(
	hours: ReadonlyMap<number, MeterHour>,
	from: string,
	to: string,
): { uncached: number; processed: number; usd: number | null } {
	let uncached = 0
	let processed = 0
	let usd: number | null = 0
	for (const hour of hoursBetween(from, to)) {
		const meterHour = hours.get(hour)
		if (meterHour === undefined) continue
		uncached += meterHour.uncached
		processed += meterHour.processed
		usd = usd === null || meterHour.usd === null ? null : usd + meterHour.usd
	}
	return { uncached, processed, usd }
}

/** One pooled measure as the estimate reports it: whole tokens, or cents for dollars. */
export function measureOf(sum: number, points: number, segments: number, cents = false): Measure {
	const high = points - segments > 0 ? (sum / (points - segments)) * 100 : null
	const round = cents ? (value: number) => Math.round(value * 100) / 100 : Math.round
	return {
		value: round((sum / points) * 100),
		low: round((sum / (points + segments)) * 100),
		high: high === null ? null : round(high),
	}
}

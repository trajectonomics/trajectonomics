import {
	type BucketKind,
	DEFAULT_PERIOD,
	isBucketKind,
	isPeriodKey,
	type PeriodKey,
	resolveBucket,
} from "./period"
import { isDay } from "./window"

/** The `asOf` a page was opened with, or null for the live view; a malformed value is ignored. */
export function readAsOf(search: string): string | null {
	const value = new URLSearchParams(search).get("asOf")
	return value !== null && isDay(value) ? value : null
}

/** The Log's view: the period the address asks for and the bucket it groups by. */
export type LogView = {
	period: PeriodKey
	bucket: BucketKind
}

/**
 * Reads the Log's `period` and `by` parameters. An unknown period opens on the default one, an
 * unknown bucket on that period's default, and a bucket the period cannot fill resolves the same
 * way.
 */
export function readLogView(search: string): LogView {
	const params = new URLSearchParams(search)
	const rawPeriod = params.get("period")
	const period = rawPeriod !== null && isPeriodKey(rawPeriod) ? rawPeriod : DEFAULT_PERIOD
	const rawBucket = params.get("by")
	const wanted = rawBucket !== null && isBucketKind(rawBucket) ? rawBucket : null
	return { period, bucket: resolveBucket(period, wanted) }
}

/** The Log's address search: `asOf` kept, and a period or bucket left out when it is default. */
export function logViewSearch(view: LogView, asOf: string | null): string {
	const params = new URLSearchParams()
	if (asOf !== null) params.set("asOf", asOf)
	if (view.period !== DEFAULT_PERIOD) params.set("period", view.period)
	if (view.bucket !== resolveBucket(view.period, null)) params.set("by", view.bucket)
	const search = params.toString()
	return search === "" ? "" : `?${search}`
}

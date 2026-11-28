import type { HourlyPayload } from "../lib/hourly-types"
import {
	type BucketKind,
	DEFAULT_PERIOD,
	type PeriodKey,
	periodWindow,
	resolveBucket,
} from "../lib/period"
import type { Health, UsagePayload } from "../lib/types"
import { type DayWindow, utcDay } from "../lib/window"
import { loadLog } from "./api"

/** The log's three states: reading, loaded, or a failed read. */
export type LogStatus = "loading" | "ready" | "error"

/** The log's browser state: one load at a time, and the newest answer wins. */
export class LogState {
	status = $state<LogStatus>("loading")
	usage = $state<UsagePayload | null>(null)
	health = $state<Health | null>(null)
	hourly = $state<HourlyPayload | null>(null)
	requestedAsOf = $state<string | null>(null)
	period = $state<PeriodKey>(DEFAULT_PERIOD)
	bucket = $state<BucketKind>(resolveBucket(DEFAULT_PERIOD, null))
	days = $state<DayWindow | null>(null)
	#run = 0

	async load(asOf: string | null = this.requestedAsOf): Promise<void> {
		const run = ++this.#run
		this.requestedAsOf = asOf
		this.status = "loading"
		this.usage = null
		this.hourly = null
		const window = periodWindow(this.period, asOf ?? utcDay(Date.now()))
		this.days = window
		try {
			const result = await loadLog(window, asOf, this.bucket)
			if (run !== this.#run) return
			this.usage = result.usage
			this.health = result.health
			this.hourly = result.hourly
			this.status = "ready"
		} catch {
			if (run !== this.#run) return
			this.status = "error"
		}
	}

	/** Switches the view to a period and bucket, resolving a bucket the period cannot fill. */
	setView(period: PeriodKey, bucket: BucketKind): void {
		this.period = period
		this.bucket = resolveBucket(period, bucket)
		void this.load()
	}
}

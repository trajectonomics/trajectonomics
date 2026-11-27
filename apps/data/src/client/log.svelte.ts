import type { Health, UsagePayload } from "../lib/types"
import { type DayWindow, lastDays, utcDay } from "../lib/window"
import { loadLog } from "./api"

/** The log's three states: reading, loaded, or a failed read. */
export type LogStatus = "loading" | "ready" | "error"

/** The log's browser state: one load at a time, and the newest answer wins. */
export class LogState {
	status = $state<LogStatus>("loading")
	usage = $state<UsagePayload | null>(null)
	health = $state<Health | null>(null)
	requestedAsOf = $state<string | null>(null)
	days = $state<DayWindow | null>(null)
	#run = 0

	async load(asOf: string | null = this.requestedAsOf): Promise<void> {
		const run = ++this.#run
		this.requestedAsOf = asOf
		this.status = "loading"
		this.usage = null
		this.health = null
		const window = lastDays(asOf ?? utcDay(Date.now()))
		this.days = window
		try {
			const result = await loadLog(window, asOf)
			if (run !== this.#run) return
			this.usage = result.usage
			this.health = result.health
			this.days = lastDays(result.usage.asOf)
			this.status = "ready"
		} catch {
			if (run !== this.#run) return
			this.status = "error"
		}
	}
}

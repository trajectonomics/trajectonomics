import type { Health, PeaksPayload, UsagePayload } from "../lib/types"
import { type DayWindow, lastDays, utcDay } from "../lib/window"
import { loadOverview } from "./api"

/** The overview's three states: reading, loaded, or a failed read. */
export type OverviewStatus = "loading" | "ready" | "error"

/** The overview's browser state: one load at a time, and the newest answer wins. */
export class OverviewState {
	status = $state<OverviewStatus>("loading")
	usage = $state<UsagePayload | null>(null)
	health = $state<Health | null>(null)
	peaks = $state<PeaksPayload | null>(null)
	requestedAsOf = $state<string | null>(null)
	days = $state<DayWindow | null>(null)
	#run = 0

	async load(asOf: string | null = this.requestedAsOf): Promise<void> {
		const run = ++this.#run
		this.requestedAsOf = asOf
		this.status = "loading"
		this.usage = null
		this.health = null
		this.peaks = null
		const window = lastDays(asOf ?? utcDay(Date.now()))
		this.days = window
		try {
			const result = await loadOverview(window, asOf)
			if (run !== this.#run) return
			this.usage = result.usage
			this.health = result.health
			this.peaks = result.peaks
			this.days = lastDays(result.usage.asOf)
			this.status = "ready"
		} catch {
			if (run !== this.#run) return
			this.status = "error"
		}
	}
}

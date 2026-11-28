import type { Collector, Meter } from "../lib/types"
import { loadCollectors } from "./api"

/** The collectors page's four states: reading, signed out, loaded, or a failed read. */
export type CollectorsStatus = "loading" | "signed_out" | "ready" | "error"

/** The collectors page's browser state: one load at a time, and the newest answer wins. */
export class CollectorsState {
	status = $state<CollectorsStatus>("loading")
	collectors = $state<Collector[]>([])
	meters = $state<Meter[]>([])
	nowMs = $state(0)
	signInFailed = $state(false)
	signOutFailed = $state(false)
	#run = 0

	async load(search: string): Promise<void> {
		const run = ++this.#run
		this.status = "loading"
		const query = new URLSearchParams(search)
		this.signInFailed = query.get("signin") === "failed"
		this.signOutFailed = query.get("signout") === "failed"
		try {
			const payload = await loadCollectors()
			if (run !== this.#run) return
			if (payload === null) {
				this.status = "signed_out"
				return
			}
			this.collectors = payload.collectors
			this.meters = payload.meters ?? []
			this.nowMs = Date.now()
			this.status = "ready"
		} catch {
			if (run !== this.#run) return
			this.status = "error"
		}
	}
}

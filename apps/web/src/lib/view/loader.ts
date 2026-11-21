import { fetchSnapshot, type TextFetcher } from "./fetch-snapshot"
import { LOADING, type SnapshotState } from "./state"

/** One Snapshot per page: its current state, a way to read it once, and a way to hear it change. */
export interface SnapshotLoader {
	current(): SnapshotState
	subscribe(listener: () => void): () => void
	load(url: string): Promise<SnapshotState>
}

/**
 * A loader for one visit. Each URL is read once: a second call for the same URL gets the first
 * request, still in flight or already settled. The state follows the URL asked for last, so a switch
 * to another URL (the Demo snapshot, say) shows that one, and a slower earlier read cannot replace it.
 */
export function createSnapshotLoader(fetchText: TextFetcher): SnapshotLoader {
	let state: SnapshotState = LOADING
	const requests = new Map<string, Promise<SnapshotState>>()
	const listeners = new Set<() => void>()
	let latest: string | null = null

	function publish(next: SnapshotState): void {
		state = next
		for (const listener of listeners) listener()
	}

	return {
		current: () => state,
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		load(url) {
			const existing = requests.get(url)
			if (url === latest && existing) return existing
			latest = url
			if (state !== LOADING) publish(LOADING)
			const request = existing ?? fetchSnapshot(url, fetchText)
			requests.set(url, request)
			return request.then((next) => {
				if (latest === url) publish(next)
				return next
			})
		},
	}
}

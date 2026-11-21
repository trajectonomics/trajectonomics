import { fetchSnapshot, type TextFetcher } from "./fetch-snapshot"
import { LOADING, type SnapshotState } from "./state"

/** One Snapshot per page: its current state, a way to read it once, and a way to hear it change. */
export interface SnapshotLoader {
	current(): SnapshotState
	subscribe(listener: () => void): () => void
	load(url: string): Promise<SnapshotState>
}

/**
 * A loader for one page. Each URL is read once: a second call for the same URL gets the first
 * request, still in flight or already settled. Islands on one page share one loader.
 */
export function createSnapshotLoader(fetchText: TextFetcher): SnapshotLoader {
	let state: SnapshotState = LOADING
	const requests = new Map<string, Promise<SnapshotState>>()
	const listeners = new Set<() => void>()

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
			if (existing) return existing
			const request = fetchSnapshot(url, fetchText).then((next) => {
				publish(next)
				return next
			})
			requests.set(url, request)
			return request
		},
	}
}

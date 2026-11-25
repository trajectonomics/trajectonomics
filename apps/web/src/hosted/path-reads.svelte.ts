import type { PathReads as LoopbackPathReads } from "../client/path-reads.svelte"
import type { LiveEntry } from "../lib/view/chance/path-state"

/** The waits of the loopback read between two asks. The hosted build never asks, so the list is empty. */
export const BUSY_WAITS_MS: readonly number[] = []

/**
 * The futures a tab reads live through the server's `traj`. The hosted build has no server, so it holds none: the
 * Chance page shows the futures the Demo snapshot already carries, and a future it does not carry stays unread.
 */
export class PathReads implements Pick<LoopbackPathReads, keyof LoopbackPathReads> {
	entries = $state<Record<string, LiveEntry>>({})

	entry(_plan: string, _index: number): LiveEntry | undefined {
		return undefined
	}

	load(_token: string, _plan: string, _index: number, _run: string): Promise<void> {
		return Promise.resolve()
	}
}

/** The tab's live futures: none. */
export const pathReads = new PathReads()

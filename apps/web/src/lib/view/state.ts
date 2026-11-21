import type { Snapshot } from "../contract"

/** The Snapshot the Dashboard is showing: not yet read, not there, not valid, or ready. */
export type SnapshotState = Loading | Missing | Invalid | Ready

/** The Snapshot is being read. Also what the server renders, before the page reads the file. */
export interface Loading {
	readonly status: "loading"
}

/** The file is not at its path, so no Snapshot has been written. */
export interface Missing {
	readonly status: "missing"
	readonly url: string
}

/**
 * The file is at its path but is not a Snapshot. `reason` completes the sentence "The Snapshot at
 * <url> …": it names the version, or says the file is not JSON or does not match the contract.
 */
export interface Invalid {
	readonly status: "invalid"
	readonly url: string
	readonly reason: string
	readonly details: readonly string[]
}

/** The Snapshot parsed against the contract, ready to render. */
export interface Ready {
	readonly status: "ready"
	readonly url: string
	readonly snapshot: Snapshot
}

/** The state before any read has finished. Frozen, so a caller cannot change the shared value. */
export const LOADING: Loading = Object.freeze({ status: "loading" })

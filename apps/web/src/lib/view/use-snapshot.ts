import { useEffect, useSyncExternalStore } from "react"
import { currentSearch, snapshotLoader } from "./browser"
import { snapshotUrl } from "./snapshot-url"
import { LOADING, type SnapshotState } from "./state"

/**
 * The Snapshot this page shows. The first island to mount starts the one read; the others share it.
 * The server and the first client render both say "loading", so the markup matches.
 */
export function useSnapshot(): SnapshotState {
	useEffect(() => {
		void snapshotLoader.load(snapshotUrl(currentSearch()))
	}, [])
	return useSyncExternalStore(snapshotLoader.subscribe, snapshotLoader.current, () => LOADING)
}

import { snapshotUrl } from "../lib/view/snapshot-url"
import { LOADING, type SnapshotState } from "../lib/view/state"
import { snapshotLoader } from "./browser"

/** The Snapshot state as a reactive value. The loader in `browser.ts` is the only reader of the file. */
class SnapshotStore {
	state = $state<SnapshotState>(LOADING)
}

const store = new SnapshotStore()
snapshotLoader.subscribe(() => {
	store.state = snapshotLoader.current()
})

/** The Snapshot this page shows: loading, missing, invalid or ready. */
export function currentSnapshot(): SnapshotState {
	return store.state
}

/** Shows the Snapshot a query string names. Each file is read once; a second call for the same one does nothing. */
export function loadSnapshot(search: string): void {
	void snapshotLoader.load(snapshotUrl(search))
}

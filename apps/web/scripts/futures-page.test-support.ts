// The path page for one future, over the Snapshot the futures ledger reads (web ADR 0020).
import { render } from "svelte/server"
import { replaceSnapshot } from "../src/client/snapshot.svelte"
import PathView from "../src/components/chance/path/PathView.svelte"
import { PLAN, snapshotOf } from "./futures.test-support"

/** The path page for one index. The Snapshot is loaded first, because the page reads the ledger names from the Snapshot it shows. */
export function page(index: number): string {
	replaceSnapshot(snapshotOf())
	return render(PathView, {
		props: {
			snapshot: snapshotOf(),
			scenario: PLAN,
			index: String(index),
			terms: "both",
			onTerms: () => {},
		},
	}).body
}

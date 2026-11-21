import { headerLine } from "../../lib/view/header"
import { useSearch } from "../../lib/view/location"
import { isDemo } from "../../lib/view/snapshot-url"
import type { SnapshotState } from "../../lib/view/state"
import { useSnapshot } from "../../lib/view/use-snapshot"
import { Badge } from "../ui/Badge"

/** The As-of, the currency and the traj version of the Snapshot, and a badge when it is the Demo. */
export function SnapshotStatus() {
	const state = useSnapshot()
	const search = useSearch()
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-sm text-muted-foreground">
			<StatusText state={state} />
			{isDemo(search) && <Badge tone="accent">Demo data</Badge>}
		</div>
	)
}

function StatusText({ state }: { readonly state: SnapshotState }) {
	if (state.status === "loading") return <span>Loading the Snapshot.</span>
	if (state.status !== "ready") return <span>No Snapshot is loaded.</span>
	const line = headerLine(state.snapshot)
	const parts = [`As of ${line.asOf}`, line.currency, `traj ${line.cliVersion}`]
	return <span>{parts.filter((part): part is string => part !== null).join(" · ")}</span>
}

import type { Snapshot } from "../../lib/contract"
import { snapshotFacts } from "../../lib/view/health/snapshot-facts"
import { ReportSection } from "../ledger/ReportSection"
import { FactList } from "./FactList"

export interface SnapshotSectionProps {
	readonly snapshot: Snapshot
}

/** The parameters the Snapshot was planned from, and the versions that wrote it. */
export function SnapshotSection({ snapshot }: SnapshotSectionProps) {
	return (
		<ReportSection
			id="this-snapshot"
			title="This Snapshot"
			intro="The As-of, horizon and choices this Snapshot was planned from, and the versions that wrote it."
		>
			<FactList facts={snapshotFacts(snapshot)} />
		</ReportSection>
	)
}

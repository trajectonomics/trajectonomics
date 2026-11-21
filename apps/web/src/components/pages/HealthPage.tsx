import { LedgerHealthSection } from "../health/LedgerHealthSection"
import { ReadsSection } from "../health/ReadsSection"
import { SnapshotSection } from "../health/SnapshotSection"
import { PageShell } from "../ui/PageShell"

/** Health: the doctor's checks and row counts, this Snapshot's parameters, and every Read it holds. */
export function HealthPage() {
	return (
		<PageShell
			title="Health"
			intro="The checks the CLI ran on your ledger, this Snapshot's parameters, and every Read it holds."
			render={(snapshot) => (
				<div className="space-y-12">
					<LedgerHealthSection doctor={snapshot.reads.doctor} />
					<SnapshotSection snapshot={snapshot} />
					<ReadsSection snapshot={snapshot} />
				</div>
			)}
		/>
	)
}

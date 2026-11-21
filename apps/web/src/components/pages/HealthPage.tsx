import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** Health: the doctor's checks, the row counts, the CLI version and every Read. Placeholder. */
export function HealthPage() {
	return (
		<PageShell
			title="Health"
			intro="The checks the CLI ran on your ledger, its row counts, and every Read this Snapshot holds."
			render={(snapshot) => (
				<ReadView
					read={snapshot.reads.doctor}
					label="Doctor"
					render={(doctor) => (
						<Stat
							label="Transactions in the ledger"
							value={String(doctor.rows.tx)}
							secondary={`${doctor.checks.length} checks · traj ${doctor.cliVersion}`}
						/>
					)}
				/>
			)}
		/>
	)
}

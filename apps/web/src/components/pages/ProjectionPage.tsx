import { formatDate } from "../../lib/format"
import { EmptyState } from "../ui/EmptyState"
import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** The Projection: one Scenario, year by year, in nominal and real terms. Placeholder. */
export function ProjectionPage() {
	return (
		<PageShell
			title="Projection"
			intro="One Scenario projected year by year, in nominal and real terms, with its notes and tax status."
			render={(snapshot) => {
				const name = snapshot.params.scenarios[0]
				const read = name === undefined ? undefined : snapshot.reads.projections[name]
				if (name === undefined || read === undefined) {
					return <EmptyState title="No Scenario to project" />
				}
				return (
					<ReadView
						read={read}
						label={`Projection of ${name}`}
						render={(run) => (
							<Stat
								label={`${name}: runs out of money`}
								value={run.runsOut ? formatDate(run.runsOut.date) : "Not within the horizon"}
							/>
						)}
					/>
				)
			}}
		/>
	)
}

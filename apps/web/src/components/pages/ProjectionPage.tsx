import { ProjectionView } from "../projection/ProjectionView"
import { PageShell } from "../ui/PageShell"

/** The Projection: one Scenario, year by year, in nominal and real terms, with its notes and tax status. */
export function ProjectionPage() {
	return (
		<PageShell
			title="Projection"
			intro="One Scenario projected year by year, in nominal and real terms, with its notes and tax status."
			render={(snapshot) => <ProjectionView projections={snapshot.reads.projections} />}
		/>
	)
}

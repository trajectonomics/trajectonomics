import { FiSections } from "../fi/FiSections"
import { PageShell } from "../ui/PageShell"

/** The FI date: the survival date per Scenario, or what binds it, and the definition it is read against. */
export function FiPage() {
	return (
		<PageShell
			title="FI date"
			intro="The date each Scenario reaches financial independence, or what stops it, and the definition it is read against."
			render={(snapshot) => <FiSections fi={snapshot.reads.fi} />}
		/>
	)
}

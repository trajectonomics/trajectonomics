import { formatDate } from "../../lib/format"
import { EmptyState } from "../ui/EmptyState"
import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** The FI date: the survival date per Scenario, or what binds it. Placeholder. */
export function FiPage() {
	return (
		<PageShell
			title="FI date"
			intro="The date each Scenario reaches financial independence, or what stops it, and the definition it is read against."
			render={(snapshot) => {
				const name = snapshot.params.scenarios[0]
				const read = name === undefined ? undefined : snapshot.reads.fi[name]
				if (name === undefined || read === undefined) {
					return <EmptyState title="No Scenario to read" />
				}
				return (
					<ReadView
						read={read}
						label={`FI date of ${name}`}
						render={(result) => (
							<Stat
								label={`${name}: financial independence`}
								value={result.fi.reachable ? formatDate(result.fi.fiDate) : "Not reachable"}
							/>
						)}
					/>
				)
			}}
		/>
	)
}

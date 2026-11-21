import { EmptyState } from "../ui/EmptyState"
import { Money } from "../ui/Money"
import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** Tax: per Levy and tax year, what is owed. Placeholder. */
export function TaxPage() {
	return (
		<PageShell
			title="Tax"
			intro="Each Levy's settlement period: what is due, prepaid and owed, and whether it is settled."
			render={(snapshot) => {
				const name = snapshot.params.scenarios[0]
				const read = name === undefined ? undefined : snapshot.reads.projections[name]
				if (name === undefined || read === undefined) {
					return <EmptyState title="No Scenario to read" />
				}
				return (
					<ReadView
						read={read}
						label={`Tax of ${name}`}
						render={(run) => {
							const first = run.taxYears[0]
							if (!first) return <EmptyState title="No tax years in view" />
							return (
								<Stat
									label={`${first.levy}, ${first.from} to ${first.to}: owed`}
									value={<Money amount={first.owed} currency={run.currency} />}
								/>
							)
						}}
					/>
				)
			}}
		/>
	)
}

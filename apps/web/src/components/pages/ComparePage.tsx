import { EmptyState } from "../ui/EmptyState"
import { Money } from "../ui/Money"
import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** Compare: two Scenarios side by side, and the deltas the CLI states between them. Placeholder. */
export function ComparePage() {
	return (
		<PageShell
			title="Compare"
			intro="Two Scenarios side by side, with each difference as the CLI states it."
			render={(snapshot) => {
				const read = snapshot.reads.compare
				if (!read) return <EmptyState title="No comparison" />
				return (
					<ReadView
						read={read}
						label="Comparison"
						render={(data) => {
							const delta = data.deltas.netWorth?.nominal
							return (
								<Stat
									label="Net worth difference at the horizon"
									value={
										delta ? <Money amount={delta} currency={data.currency} signed /> : "Not stated"
									}
								/>
							)
						}}
					/>
				)
			}}
		/>
	)
}

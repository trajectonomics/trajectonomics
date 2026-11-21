import { formatDate } from "../../lib/format"
import { Money } from "../ui/Money"
import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** Net worth: the headline, the month-end history and the composition by account. Placeholder. */
export function NetWorthPage() {
	return (
		<PageShell
			title="Net worth"
			intro="Net worth at the As-of, its assets and liabilities by account, and its month-end history."
			render={(snapshot) => (
				<ReadView
					read={snapshot.reads.netWorth}
					label="Net worth"
					render={(data) => (
						<Stat
							label="Net worth"
							value={data.totals.map((total) => (
								<Money key={total.currency} amount={total.amount} currency={total.currency} />
							))}
							secondary={`As of ${formatDate(data.asOf)}`}
						/>
					)}
				/>
			)}
		/>
	)
}

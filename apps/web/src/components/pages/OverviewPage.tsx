import { formatDate } from "../../lib/format"
import { netWorthHistorySeries } from "../../lib/view/overview/net-worth-history"
import { LineChart } from "../chart/LineChart"
import { Money } from "../ui/Money"
import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** The Overview: the headline figures, each linking to its page. Placeholder until its own change. */
export function OverviewPage() {
	return (
		<PageShell
			title="Overview"
			intro="The headline figures of your ledger, and the history behind net worth."
			render={(snapshot) => (
				<ReadView
					read={snapshot.reads.netWorth}
					label="Net worth"
					render={(data) => (
						<div className="space-y-6">
							<Stat
								label="Net worth"
								value={data.totals.map((total) => (
									<Money key={total.currency} amount={total.amount} currency={total.currency} />
								))}
								secondary={`As of ${formatDate(data.asOf)}`}
							/>
							<LineChart
								label="Net worth at each month-end"
								series={[netWorthHistorySeries(snapshot.reads.netWorthHistory)]}
							/>
						</div>
					)}
				/>
			)}
		/>
	)
}

import type { NetWorthPageView } from "../../lib/view/net-worth/page"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"
import { AccountsTable } from "./AccountsTable"
import { CompositionBars } from "./CompositionBars"
import { HistoryChart } from "./HistoryChart"
import { LiabilityList } from "./LiabilityList"
import { MonthEndTable } from "./MonthEndTable"
import { Totals } from "./Totals"

export interface NetWorthContentProps {
	readonly view: NetWorthPageView
}

/** The Net worth page's body: the headline, the history, the composition, every row and the table. */
export function NetWorthContent({ view }: NetWorthContentProps) {
	return (
		<ReadView
			read={view.netWorth}
			label="Net worth"
			render={(data) => (
				<div className="space-y-10">
					<section className="space-y-4">
						<Stat
							label="Net worth"
							value={<Totals totals={data.totals} className="text-3xl font-semibold" />}
							secondary={`As of ${data.asOf}`}
						/>
						{data.note && (
							<p className="rounded-md border border-border p-3 text-sm">{data.note}</p>
						)}
						<Provenance argv={view.netWorth.argv} />
					</section>
					<HistoryChart history={view.history} />
					<section aria-labelledby="composition-title" className="space-y-5">
						<h2 id="composition-title" className="text-base font-semibold">
							Assets and liabilities
						</h2>
						<CompositionBars bars={data.bars} />
						<LiabilityList rows={data.liabilities} />
					</section>
					<section aria-labelledby="accounts-title" className="space-y-3">
						<h2 id="accounts-title" className="text-base font-semibold">
							Every account
						</h2>
						<AccountsTable rows={data.rows} />
					</section>
					<MonthEndTable rows={view.history.rows} />
				</div>
			)}
		/>
	)
}

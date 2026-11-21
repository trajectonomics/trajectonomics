import type { Read } from "../../lib/contract"
import type { NetWorthCardView } from "../../lib/view/overview/view"
import { Sparkline } from "../chart/Sparkline"
import { Totals } from "../net-worth/Totals"
import { Card } from "../ui/Card"
import { ReadView } from "../ui/ReadView"

export interface NetWorthCardProps {
	readonly netWorth: Read<NetWorthCardView>
}

/** Net worth: the total as the largest figure, its As-of, a sparkline of the month-ends and any note. */
export function NetWorthCard({ netWorth }: NetWorthCardProps) {
	return (
		<Card title="Net worth" href="/net-worth/" argv={netWorth.argv}>
			<ReadView
				read={netWorth}
				label="Net worth"
				render={(view) => (
					<div className="space-y-4">
						<div>
							<Totals totals={view.totals} className="text-3xl font-semibold tracking-tight" />
							<p className="mt-1 text-sm text-muted-foreground">As of {view.asOf}</p>
						</div>
						{view.note && <p className="text-sm">{view.note}</p>}
						{view.sparkline.length > 1 && (
							<div>
								<Sparkline label="Net worth at each month-end" values={view.sparkline} />
								<p className="mt-1 text-xs text-muted-foreground">Month-end history</p>
							</div>
						)}
					</div>
				)}
			/>
		</Card>
	)
}

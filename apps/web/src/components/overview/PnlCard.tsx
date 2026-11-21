import type { Read } from "../../lib/contract"
import { accountTypeLabel } from "../../lib/view/net-worth/account-type"
import type { PnlView } from "../../lib/view/overview/pnl"
import { Totals } from "../net-worth/Totals"
import { Card } from "../ui/Card"
import { Money } from "../ui/Money"
import { ReadView } from "../ui/ReadView"

export interface PnlCardProps {
	readonly pnl: Read<PnlView>
}

/** Profit and loss for the period: the CLI's totals and its three largest rows. */
export function PnlCard({ pnl }: PnlCardProps) {
	return (
		<Card title="Profit and loss, year to date" href="/ledger/" argv={pnl.argv}>
			<ReadView
				read={pnl}
				label="Profit and loss"
				render={(view) => (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">{view.period}</p>
						<div>
							<p className="text-sm text-muted-foreground">Income less expenses</p>
							<Totals totals={view.totals} className="mt-1 text-2xl font-semibold tracking-tight" />
						</div>
						{view.hasRows ? (
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">Largest rows</p>
								<ul className="divide-y divide-border text-sm">
									{view.largest.map((row) => (
										<li
											key={`${row.account.id}:${row.currency}`}
											className="flex items-center justify-between gap-3 py-2"
										>
											<span className="min-w-0 truncate">
												{row.account.name}
												<span className="ml-2 text-xs text-muted-foreground">
													{accountTypeLabel(row.type)}
												</span>
											</span>
											<span className="shrink-0">
												<Money amount={row.amount} currency={row.currency} />
											</span>
										</li>
									))}
								</ul>
								<p className="text-xs text-muted-foreground">
									Income is shown negative and expenses positive, as the ledger books them.
								</p>
							</div>
						) : (
							<p className="text-sm">No income or expense in this period.</p>
						)}
					</div>
				)}
			/>
		</Card>
	)
}

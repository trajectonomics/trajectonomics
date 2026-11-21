import type { AmountRow } from "../../lib/contract"
import { Money } from "../ui/Money"

export interface LiabilityListProps {
	readonly rows: readonly AmountRow[]
}

/** The liability accounts with their amounts. The ledger states them negative, and they stay so. */
export function LiabilityList({ rows }: LiabilityListProps) {
	return (
		<div className="space-y-2">
			<p className="text-sm text-muted-foreground">
				Liabilities, shown negative as the ledger states them: what you owe.
			</p>
			{rows.length === 0 ? (
				<p className="text-sm text-muted-foreground">No liability accounts.</p>
			) : (
				<ul className="divide-y divide-border text-sm">
					{rows.map((row) => (
						<li
							key={`${row.account.id}:${row.currency}`}
							className="flex items-center justify-between gap-3 py-2"
						>
							<span className="min-w-0 truncate">{row.account.name}</span>
							<span className="shrink-0">
								<Money amount={row.amount} currency={row.currency} />
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

import { formatDate } from "../../lib/format"
import type { TransactionRow } from "../../lib/view/ledger/transactions"
import { Money } from "../ui/Money"

export interface TransactionCardsProps {
	readonly rows: readonly TransactionRow[]
}

/** The transactions as a stacked list, so a phone shows every amount without scrolling sideways. */
export function TransactionCards({ rows }: TransactionCardsProps) {
	return (
		<ul aria-label="Transactions" className="space-y-3">
			{rows.map((row) => (
				<li key={row.id} className="space-y-2 rounded-lg border border-border p-3 text-sm">
					<div className="flex justify-between gap-3">
						<span className="font-medium tabular-nums">{formatDate(row.date)}</span>
						<span className="min-w-0 break-words text-right">
							{row.memo ?? <span className="text-muted-foreground">No memo</span>}
						</span>
					</div>
					<ul className="space-y-1">
						{row.postings.map((posting) => (
							<li key={posting.key} className="flex justify-between gap-4">
								<span className="min-w-0 break-words">{posting.account}</span>
								<Money amount={posting.amount} currency={posting.currency} />
							</li>
						))}
					</ul>
				</li>
			))}
		</ul>
	)
}

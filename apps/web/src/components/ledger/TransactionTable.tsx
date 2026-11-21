import { formatDate } from "../../lib/format"
import type { TransactionRow } from "../../lib/view/ledger/transactions"
import { DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface TransactionTableProps {
	readonly rows: readonly TransactionRow[]
}

/** The transactions as a table, for a screen wide enough to hold the postings beside the memo. */
export function TransactionTable({ rows }: TransactionTableProps) {
	return (
		<DataTable
			caption="Transactions"
			rows={rows}
			rowKey={(row) => row.id}
			columns={[
				{ key: "date", header: "Date", cell: (row) => formatDate(row.date) },
				{
					key: "memo",
					header: "Memo",
					cell: (row) => row.memo ?? <span className="text-muted-foreground">No memo</span>,
				},
				{
					key: "postings",
					header: "Postings",
					cell: (row) => (
						<ul className="space-y-1">
							{row.postings.map((posting) => (
								<li key={posting.key} className="flex justify-between gap-6">
									<span>{posting.account}</span>
									<Money amount={posting.amount} currency={posting.currency} />
								</li>
							))}
						</ul>
					),
				},
			]}
		/>
	)
}

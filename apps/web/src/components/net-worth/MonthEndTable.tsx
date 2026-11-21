import type { MonthEndRow } from "../../lib/view/net-worth/history"
import { DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface MonthEndTableProps {
	readonly rows: readonly MonthEndRow[]
}

/** The month-end history as a table: the accessible form of the chart, folded away by default. */
export function MonthEndTable({ rows }: MonthEndTableProps) {
	return (
		<details className="rounded-lg border border-border p-4">
			<summary className="cursor-pointer text-sm font-medium">Month-end figures as a table</summary>
			<div className="mt-4">
				<DataTable
					caption="Net worth at each month-end"
					rows={rows}
					rowKey={(row) => String(row.index)}
					columns={[
						{ key: "month", header: "Month end", cell: (row) => row.asOf },
						{
							key: "net-worth",
							header: "Net worth",
							numeric: true,
							cell: (row) =>
								row.totals === null ? (
									<span className="text-destructive">Could not be read ({row.code})</span>
								) : (
									row.totals.map((total) => (
										<Money key={total.currency} amount={total.amount} currency={total.currency} />
									))
								),
						},
					]}
				/>
			</div>
		</details>
	)
}

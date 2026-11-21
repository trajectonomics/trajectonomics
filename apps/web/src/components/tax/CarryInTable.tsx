import type { CarryInRow } from "../../lib/view/tax"
import { type Column, DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface CarryInTableProps {
	readonly rows: readonly CarryInRow[]
	readonly currency: string
}

/** The Carry-in records the result echoes: each period's tallies and what it had prepaid. */
export function CarryInTable({ rows, currency }: CarryInTableProps) {
	const columns: readonly Column<CarryInRow>[] = [
		{ key: "levy", header: "Levy", cell: (row) => row.levy },
		{ key: "start", header: "Period starts", cell: (row) => row.periodStart },
		{ key: "source", header: "Source", cell: (row) => row.source },
		{
			key: "prepaid",
			header: "Prepaid",
			numeric: true,
			cell: (row) => <Money amount={row.prepaid} />,
		},
		{
			key: "tallies",
			header: "Tallied before the As-of",
			cell: (row) => (
				<ul className="space-y-1">
					{row.tallies.map((tally) => (
						<li key={tally.key} className="flex flex-wrap justify-between gap-x-4">
							<span>
								{tally.label} <span className="text-muted-foreground">({tally.basis})</span>
							</span>
							<Money amount={tally.amount} />
						</li>
					))}
				</ul>
			),
		},
	]
	return (
		<DataTable
			caption={`Carry-in records, figures in ${currency}`}
			columns={columns}
			rows={rows}
			rowKey={(row) => row.key}
		/>
	)
}

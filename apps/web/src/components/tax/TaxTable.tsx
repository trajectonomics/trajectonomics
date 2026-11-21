import type { TaxRow } from "../../lib/view/tax"
import { Badge } from "../ui/Badge"
import { type Column, DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface TaxTableProps {
	readonly rows: readonly TaxRow[]
	readonly currency: string
}

/** One row per Levy settlement period, with its figures, a refund in words, and its two marks. */
export function TaxTable({ rows, currency }: TaxTableProps) {
	const columns: readonly Column<TaxRow>[] = [
		{ key: "levy", header: "Levy", cell: (row) => row.levy },
		{ key: "period", header: "Period", cell: (row) => row.period },
		{ key: "settles", header: "Settles", cell: (row) => row.settles },
		{
			key: "due",
			header: "Due before prepayment",
			numeric: true,
			cell: (row) => <Money amount={row.due} />,
		},
		{
			key: "prepaid",
			header: "Prepaid",
			numeric: true,
			cell: (row) => <Money amount={row.prepaid} />,
		},
		{ key: "owed", header: "Owed", numeric: true, cell: (row) => <Owed row={row} /> },
		{ key: "marks", header: "Marks", cell: (row) => <Marks row={row} /> },
	]
	return (
		<div className="space-y-3">
			<DataTable
				caption={`Tax years, figures in ${currency}`}
				columns={columns}
				rows={rows}
				rowKey={(row) => row.key}
			/>
			<dl className="space-y-1 text-sm text-muted-foreground">
				<div>
					<dt className="inline font-medium text-foreground">Settled:</dt>{" "}
					<dd className="inline">
						the settlement date falls inside the Projection, so its charge is included.
					</dd>
				</div>
				<div>
					<dt className="inline font-medium text-foreground">Partial:</dt>{" "}
					<dd className="inline">
						the Projection ended before the period did, so the period is incomplete.
					</dd>
				</div>
			</dl>
		</div>
	)
}

/** The owed figure with its sign kept; a negative one is labelled a refund, not a debt. */
function Owed({ row }: { readonly row: TaxRow }) {
	return (
		<span className="inline-flex flex-wrap items-center justify-end gap-2">
			<Money amount={row.owed} />
			{row.refund && <Badge tone="accent">Refund</Badge>}
		</span>
	)
}

function Marks({ row }: { readonly row: TaxRow }) {
	if (!row.settled && !row.partial) return <span className="text-muted-foreground">None</span>
	return (
		<span className="flex flex-wrap gap-1">
			{row.settled && <Badge>Settled</Badge>}
			{row.partial && <Badge>Partial</Badge>}
		</span>
	)
}

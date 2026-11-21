import { formatDate } from "../../lib/format"
import type { AnnualRow } from "../../lib/view/projection/annual"
import { Badge } from "../ui/Badge"
import { type Column, DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface AnnualTableProps {
	readonly rows: readonly AnnualRow[]
	readonly currency: string
}

/** The annual roll-up: one row per year, with a mark on the year the Projection ended in part. */
export function AnnualTable({ rows, currency }: AnnualTableProps) {
	return (
		<DataTable
			caption={`Each year, in ${currency}`}
			columns={annualColumns()}
			rows={rows}
			rowKey={(row) => String(row.index)}
		/>
	)
}

function annualColumns(): Column<AnnualRow>[] {
	return [
		{
			key: "period",
			header: "Period",
			cell: (row) => (
				<>
					{formatDate(row.from)} – {formatDate(row.to)}
					{row.partial && (
						<span className="mt-1 block">
							<Badge>Partial year</Badge>
						</span>
					)}
				</>
			),
		},
		money("opening", "Opening net worth", (row) => row.openingNetWorth),
		money("closing", "Closing net worth", (row) => row.closingNetWorth),
		money("income", "Income", (row) => row.income),
		money("expense", "Expense", (row) => row.expense),
		money("contributions", "Contributions", (row) => row.contributions),
		money("unfunded", "Unfunded contributions", (row) => row.unfundedContributions),
		money("interest", "Interest", (row) => row.interest),
		money("unmet", "Unmet", (row) => row.unmet),
		{
			key: "real",
			header: "Real net worth, in As-of terms",
			numeric: true,
			cell: (row) => (
				<>
					<Money amount={row.realNetWorth.amount} />
					<span className="block text-xs text-muted-foreground">
						at {formatDate(row.realNetWorth.date)}
					</span>
				</>
			),
		},
	]
}

function money(
	key: string,
	header: string,
	amountOf: (row: AnnualRow) => string,
): Column<AnnualRow> {
	return {
		key,
		header,
		numeric: true,
		cell: (row) => <Money amount={amountOf(row)} />,
	}
}

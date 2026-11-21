import { formatDate } from "../../lib/format"
import type { MonthlyRow } from "../../lib/view/projection/annual"
import { type Column, DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface MonthlyTableProps {
	readonly rows: readonly MonthlyRow[]
	readonly count: number
}

/** The monthly rows, behind a disclosure: the CLI ran the Projection with `--monthly`. */
export function MonthlyTable({ rows, count }: MonthlyTableProps) {
	return (
		<details className="rounded-lg border border-border p-4">
			<summary className="cursor-pointer text-sm font-medium">Monthly rows ({count})</summary>
			<div className="mt-4">
				<DataTable
					caption="Each month"
					columns={monthlyColumns()}
					rows={rows}
					rowKey={(row) => row.date}
				/>
			</div>
		</details>
	)
}

function monthlyColumns(): Column<MonthlyRow>[] {
	return [
		{ key: "date", header: "Date", cell: (row) => formatDate(row.date) },
		money("netWorth", "Net worth", (row) => row.netWorth),
		money("real", "Real net worth, in As-of terms", (row) => row.realNetWorth),
		money("accessible", "Accessible net worth", (row) => row.accessibleNetWorth),
		money(
			"realAccessible",
			"Accessible, real, in As-of terms",
			(row) => row.realAccessibleNetWorth,
		),
	]
}

function money(
	key: string,
	header: string,
	amountOf: (row: MonthlyRow) => string,
): Column<MonthlyRow> {
	return {
		key,
		header,
		numeric: true,
		cell: (row) => <Money amount={amountOf(row)} />,
	}
}

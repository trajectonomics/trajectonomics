import type { FigureRow } from "../../lib/view/compare"
import { type Column, DataTable } from "../ui/DataTable"
import { CellView } from "./CellView"

export interface CompareFiguresProps {
	readonly rows: readonly FigureRow[]
	readonly currency: string
	/** The headers of A and B, with their Scenario names. */
	readonly headers: readonly [string, string]
}

/** One row per figure: A, the CLI's difference (B minus A) and B. */
export function CompareFigures({ rows, currency, headers }: CompareFiguresProps) {
	const columns: readonly Column<FigureRow>[] = [
		{ key: "figure", header: "Figure", cell: (row) => row.label },
		{ key: "a", header: headers[0], numeric: true, cell: (row) => <CellView cell={row.a} /> },
		{
			key: "difference",
			header: "Difference, B minus A",
			numeric: true,
			cell: (row) => <CellView cell={row.difference} />,
		},
		{ key: "b", header: headers[1], numeric: true, cell: (row) => <CellView cell={row.b} /> },
	]
	return (
		<DataTable
			caption={`Figures in ${currency}`}
			columns={columns}
			rows={rows}
			rowKey={(row) => row.key}
		/>
	)
}

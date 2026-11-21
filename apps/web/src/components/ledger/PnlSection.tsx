import type { Pnl, Read } from "../../lib/contract"
import type { PnlLine } from "../../lib/view/ledger/pnl"
import { pnlView } from "../../lib/view/ledger/pnl"
import { type Column, DataTable } from "../ui/DataTable"
import { EmptyState } from "../ui/EmptyState"
import { Money } from "../ui/Money"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { ReportSection } from "./ReportSection"

export interface PnlSectionProps {
	readonly pnl: Read<Pnl>
}

const AMOUNT_COLUMNS: readonly Column<PnlLine>[] = [
	{ key: "account", header: "Account", cell: (line) => line.account },
	{
		key: "amount",
		header: "Amount",
		numeric: true,
		cell: (line) => <Money amount={line.amount} currency={line.currency} />,
	},
]

/** Profit and loss over the period: income rows, expense rows, then the CLI's totals. */
export function PnlSection({ pnl }: PnlSectionProps) {
	return (
		<ReportSection
			id="profit-and-loss"
			title="Profit and loss"
			intro="Income is negative and expense positive, as the ledger holds them. The total is the CLI's own figure, not a sum of these rows."
		>
			<ReadView
				read={pnl}
				label="Profit and loss"
				render={(report) => {
					const view = pnlView(report)
					return (
						<div className="space-y-6">
							<p className="text-sm">
								<span className="text-muted-foreground">Period </span>
								{view.period}
								{view.project !== null && (
									<span className="text-muted-foreground">{` · project ${view.project}`}</span>
								)}
							</p>
							<LinesTable caption="Income" lines={view.income} empty="No income in this period." />
							<LinesTable
								caption="Expenses"
								lines={view.expense}
								empty="No expenses in this period."
							/>
							<DataTable
								caption="Totals, as the CLI states them"
								rows={view.totals}
								rowKey={(total) => total.currency}
								columns={[
									{ key: "currency", header: "Currency", cell: (total) => total.currency },
									{
										key: "total",
										header: "Total",
										numeric: true,
										cell: (total) => <Money amount={total.amount} />,
									},
								]}
							/>
							<Provenance argv={pnl.argv} />
						</div>
					)
				}}
			/>
		</ReportSection>
	)
}

interface LinesTableProps {
	readonly caption: string
	readonly lines: readonly PnlLine[]
	readonly empty: string
}

function LinesTable({ caption, lines, empty }: LinesTableProps) {
	if (lines.length === 0) return <EmptyState title={empty} />
	return (
		<DataTable
			caption={caption}
			rows={lines}
			rowKey={(line) => line.key}
			columns={AMOUNT_COLUMNS}
		/>
	)
}

import type { Balance, Read } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { trialBalanceView } from "../../lib/view/ledger/trial-balance"
import { DataTable } from "../ui/DataTable"
import { EmptyState } from "../ui/EmptyState"
import { Money } from "../ui/Money"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { ReportSection } from "./ReportSection"

export interface TrialBalanceSectionProps {
	readonly balance: Read<Balance>
}

/** The trial balance at the As-of: every leaf's debit and credit, and the totals per currency. */
export function TrialBalanceSection({ balance }: TrialBalanceSectionProps) {
	return (
		<ReportSection
			id="trial-balance"
			title="Trial balance"
			intro="Each leaf account's balance at the As-of, split into a debit column and a credit column. The totals per currency should agree."
		>
			<ReadView
				read={balance}
				label="The trial balance"
				render={(data) => {
					const view = trialBalanceView(data.trialBalance)
					if (view === null) {
						return <EmptyState title="No trial balance in this Snapshot" />
					}
					return (
						<div className="space-y-6">
							<DataTable
								caption={`Trial balance at ${formatDate(data.asOf)}`}
								rows={view.lines}
								rowKey={(line) => line.key}
								columns={[
									{ key: "account", header: "Account", cell: (line) => line.account },
									{
										key: "debit",
										header: "Debit",
										numeric: true,
										cell: (line) => <Money amount={line.debit} currency={line.currency} />,
									},
									{
										key: "credit",
										header: "Credit",
										numeric: true,
										cell: (line) => <Money amount={line.credit} currency={line.currency} />,
									},
								]}
							/>
							<DataTable
								caption="Totals, as the CLI states them"
								rows={view.totals}
								rowKey={(total) => total.currency}
								columns={[
									{ key: "currency", header: "Currency", cell: (total) => total.currency },
									{
										key: "debit",
										header: "Debit",
										numeric: true,
										cell: (total) => <Money amount={total.debit} />,
									},
									{
										key: "credit",
										header: "Credit",
										numeric: true,
										cell: (total) => <Money amount={total.credit} />,
									},
								]}
							/>
							<Provenance argv={balance.argv} />
						</div>
					)
				}}
			/>
		</ReportSection>
	)
}

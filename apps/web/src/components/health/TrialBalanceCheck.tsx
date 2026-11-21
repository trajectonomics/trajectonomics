import type { Doctor } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { Badge } from "../ui/Badge"
import { DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface TrialBalanceCheckProps {
	readonly trialBalance: Doctor["trialBalance"] | null
}

/** Whether the trial balance balances at the doctor's As-of, with its totals. */
export function TrialBalanceCheck({ trialBalance }: TrialBalanceCheckProps) {
	if (trialBalance === null || trialBalance === undefined) {
		return (
			<p className="text-sm text-muted-foreground">The doctor did not check the trial balance.</p>
		)
	}
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-3">
				<Badge tone={trialBalance.balanced ? "neutral" : "accent"}>
					{trialBalance.balanced ? "Balances" : "Does not balance"}
				</Badge>
				<span className="text-sm text-muted-foreground">
					{`Trial balance at ${formatDate(trialBalance.asOf)}`}
				</span>
			</div>
			<DataTable
				caption="Trial balance totals"
				rows={trialBalance.totals}
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
		</div>
	)
}

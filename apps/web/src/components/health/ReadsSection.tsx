import type { Snapshot } from "../../lib/contract"
import { type AuditRow, readAudit } from "../../lib/view/health/read-audit"
import { ReportSection } from "../ledger/ReportSection"
import { type Column, DataTable } from "../ui/DataTable"
import { EmptyState } from "../ui/EmptyState"

export interface ReadsSectionProps {
	readonly snapshot: Snapshot
}

const COLUMNS: readonly Column<AuditRow>[] = [
	{ key: "question", header: "Question", cell: (row) => row.question },
	{
		key: "command",
		header: "Command",
		cell: (row) => <code className="font-mono text-xs">{row.command}</code>,
	},
	{ key: "status", header: "Status", cell: (row) => <Status row={row} /> },
]

/** Every Read the Snapshot holds, with its command and its status. Failed Reads come first. */
export function ReadsSection({ snapshot }: ReadsSectionProps) {
	const rows = readAudit(snapshot)
	return (
		<ReportSection
			id="every-read"
			title="Every Read"
			intro="The audit trail for every figure on this Dashboard: each traj call the Snapshot holds, and whether it succeeded."
		>
			{rows.length === 0 ? (
				<EmptyState title="No Reads in this Snapshot" />
			) : (
				<DataTable caption="Reads" rows={rows} rowKey={(row) => row.key} columns={COLUMNS} />
			)}
		</ReportSection>
	)
}

function Status({ row }: { readonly row: AuditRow }) {
	if (row.error === null) return <span>ok</span>
	return (
		<div className="space-y-1">
			<p className="font-medium text-destructive">{`Failed: ${row.error.code}`}</p>
			<p>{row.error.message}</p>
			{row.error.hint !== null && <p className="text-muted-foreground">{row.error.hint}</p>}
		</div>
	)
}

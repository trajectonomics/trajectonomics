import type { Doctor, Read } from "../../lib/contract"
import { doctorView } from "../../lib/view/health/doctor"
import { ReportSection } from "../ledger/ReportSection"
import { Badge } from "../ui/Badge"
import { DataTable } from "../ui/DataTable"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { FactList } from "./FactList"
import { TrialBalanceCheck } from "./TrialBalanceCheck"

export interface LedgerHealthSectionProps {
	readonly doctor: Read<Doctor>
}

/** The doctor's verdict, its checks, the data directory and database, the row counts and the trial balance. */
export function LedgerHealthSection({ doctor }: LedgerHealthSectionProps) {
	return (
		<ReportSection
			id="ledger-health"
			title="Ledger health"
			intro="The checks traj doctor ran on your ledger. The doctor reads and writes nothing."
		>
			<ReadView
				read={doctor}
				label="Ledger health"
				render={(data) => {
					const view = doctorView(data)
					return (
						<div className="space-y-6">
							<div className="flex flex-wrap items-center gap-3">
								<Badge tone={view.ok ? "neutral" : "accent"}>
									{view.ok ? "OK" : "Needs attention"}
								</Badge>
								<span className="text-sm text-muted-foreground">traj {view.cliVersion}</span>
							</div>
							<DataTable
								caption="Checks"
								rows={view.checks}
								rowKey={(check) => check.key}
								columns={[
									{ key: "check", header: "Check", cell: (check) => check.label },
									{
										key: "status",
										header: "Status",
										cell: (check) => (
											<span
												className={
													check.status === "fail" ? "font-medium text-destructive" : undefined
												}
											>
												{check.status}
											</span>
										),
									},
									{ key: "detail", header: "Detail", cell: (check) => check.detail },
								]}
							/>
							<div className="grid gap-6 md:grid-cols-2">
								<section className="space-y-3">
									<h3 className="text-sm font-medium">Data directory and database</h3>
									<FactList
										facts={[
											{ label: "Directory", value: view.directory.path },
											{ label: "Exists", value: yesNo(view.directory.exists) },
											{ label: "Writable", value: yesNo(view.directory.writable) },
											{ label: "Database", value: view.database.path },
											{ label: "Size", value: view.database.size },
											{ label: "Schema", value: view.database.schema },
										]}
									/>
								</section>
								<section className="space-y-3">
									<h3 className="text-sm font-medium">Row counts</h3>
									<FactList
										facts={view.rows.map((row) => ({ label: row.label, value: row.count }))}
									/>
								</section>
							</div>
							<TrialBalanceCheck trialBalance={view.trialBalance} />
							<Provenance argv={doctor.argv} />
						</div>
					)
				}}
			/>
		</ReportSection>
	)
}

function yesNo(value: boolean): string {
	return value ? "Yes" : "No"
}

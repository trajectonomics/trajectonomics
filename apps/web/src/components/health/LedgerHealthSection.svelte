<script lang="ts">
import type { Doctor, Read } from "../../lib/contract"
import { type CheckLine, doctorView } from "../../lib/view/health/doctor"
import ReportSection from "../ledger/ReportSection.svelte"
import Badge from "../ui/Badge.svelte"
import DataTable from "../ui/DataTable.svelte"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import type { Column } from "../ui/table-types"
import FactList from "./FactList.svelte"
import TrialBalanceCheck from "./TrialBalanceCheck.svelte"

interface Props {
	doctor: Read<Doctor>
}

let { doctor }: Props = $props()

const checkColumns: Column<CheckLine>[] = [
	{ key: "check", header: "Check", cell: checkCell },
	{ key: "status", header: "Status", cell: statusCell },
	{ key: "detail", header: "Detail", cell: detailCell },
]
</script>

{#snippet checkCell(check: CheckLine)}{check.label}{/snippet}

{#snippet statusCell(check: CheckLine)}
	<span class={check.status === "fail" ? "font-medium text-destructive" : undefined}>{check.status}</span>
{/snippet}

{#snippet detailCell(check: CheckLine)}<span data-cli>{check.detail}</span>{/snippet}

<!-- The doctor's verdict, its checks, the data directory and database, the row counts and the trial balance. -->
<ReportSection
	id="ledger-health"
	title="Ledger health"
	intro="The checks traj doctor ran on your ledger. The doctor reads and writes nothing."
>
	<ReadView read={doctor} label="Ledger health">
		{#snippet children(data)}
			{@const view = doctorView(data)}
			<div class="space-y-6">
				<div class="flex flex-wrap items-center gap-3">
					<Badge tone={view.ok ? "neutral" : "accent"}>{view.ok ? "OK" : "Needs attention"}</Badge>
				</div>
				<DataTable
					caption="Checks"
					rows={view.checks}
					rowKey={(check) => check.key}
					columns={checkColumns}
				/>
				<div class="grid gap-6 md:grid-cols-2">
					<section class="space-y-3">
						<h3 class="text-sm font-medium">Data directory and database</h3>
						<FactList
							facts={[
								{ label: "Directory", value: view.directory.path },
								{ label: "Exists", value: view.directory.exists ? "Yes" : "No" },
								{ label: "Writable", value: view.directory.writable ? "Yes" : "No" },
								{ label: "Database", value: view.database.path },
								{ label: "Size", value: view.database.size },
								{ label: "Schema", value: view.database.schema },
							]}
						/>
					</section>
					<section class="space-y-3">
						<h3 class="text-sm font-medium">Row counts</h3>
						<FactList facts={view.rows.map((row) => ({ label: row.label, value: row.count }))} />
					</section>
				</div>
				<TrialBalanceCheck trialBalance={view.trialBalance} />
				<Provenance name="Ledger health" commands={[doctor.argv]} />
			</div>
		{/snippet}
	</ReadView>
</ReportSection>

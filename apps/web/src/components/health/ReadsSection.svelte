<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { isCliError } from "../../lib/edit/failure"
import { type AuditRow, readAudit } from "../../lib/view/health/read-audit"
import ReportSection from "../ledger/ReportSection.svelte"
import DataTable from "../ui/DataTable.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	snapshot: Snapshot
}

let { snapshot }: Props = $props()
// Failed Reads come first.
const rows = $derived(readAudit(snapshot))

// The Command column is a traj command, so it follows the Display setting (#937).
const columns: Column<AuditRow>[] = $derived([
	{ key: "question", header: "Question", cell: questionCell },
	...(preferences.showCommands ? [{ key: "command", header: "Command", cell: commandCell }] : []),
	{ key: "status", header: "Status", cell: statusCell },
])
</script>

{#snippet questionCell(row: AuditRow)}{row.question}{/snippet}

{#snippet commandCell(row: AuditRow)}<code class="font-mono text-xs">{row.command}</code>{/snippet}

{#snippet statusCell(row: AuditRow)}
	{#if row.error === null}
		<span>ok</span>
	{:else}
		{@const fromCli = isCliError(row.error)}
		<div class="space-y-1">
			<p class="font-medium text-destructive">{`Failed: ${row.error.code}`}</p>
			<p data-cli={fromCli ? "" : undefined}>{row.error.message}</p>
			{#if row.note !== null}
				<p class="text-muted-foreground">{row.note}</p>
			{/if}
			{#if row.error.hint !== null}
				<p class="text-muted-foreground" data-cli={fromCli ? "" : undefined}>{row.error.hint}</p>
			{/if}
		</div>
	{/if}
{/snippet}

<!-- Every Read the Snapshot holds, with its status, and its command when the traj commands are on. Failed Reads come first. -->
<ReportSection
	id="every-read"
	title="Every Read"
	intro="The audit trail for every figure on this Dashboard: each traj call these figures hold, and whether it succeeded."
>
	{#if rows.length === 0}
		<EmptyState title="No Reads in these figures" />
	{:else}
		<DataTable
			caption="Reads"
			{rows}
			rowKey={(row) => row.key}
			rowId={(row) => (row.failed ? `check-${row.key}` : undefined)}
			{columns}
		/>
	{/if}
</ReportSection>

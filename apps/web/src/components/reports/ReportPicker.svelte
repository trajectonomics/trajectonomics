<script lang="ts">
import type { ReportColumn, ReportTable } from "../../lib/view/reports/table"

interface Props {
	/** The tables the Snapshot's plan holds, in the order the CLI gave them. */
	tables: readonly ReportTable[]
	/** The CLI name of the table picked. */
	selected: string
	/** The fields of the picked table, and the ones the person has hidden. */
	columns: readonly ReportColumn[]
	hidden: readonly string[]
	onPick: (name: string) => void
	onToggle: (key: string) => void
}

let { tables, selected, columns, hidden, onPick, onToggle }: Props = $props()
</script>

<!-- The picker is for the screen: a printed page shows the table only. -->
<div class="print:hidden space-y-4">
	<label class="flex max-w-full flex-col gap-1 text-sm">
		<span class="text-muted-foreground">Table</span>
		<select
			name="table"
			value={selected}
			onchange={(event) => onPick(event.currentTarget.value)}
			class="w-full max-w-xl rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		>
			{#each tables as table (table.name)}
				<option value={table.name}>{table.label}</option>
			{/each}
		</select>
	</label>
	<fieldset class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
		<legend class="mb-1 text-muted-foreground">Fields</legend>
		{#each columns as column (column.key)}
			<label class="flex items-center gap-1.5">
				<input
					type="checkbox"
					checked={!hidden.includes(column.key)}
					onchange={() => onToggle(column.key)}
				/>
				<span class="font-mono text-xs">{column.key}</span>
			</label>
		{/each}
	</fieldset>
</div>

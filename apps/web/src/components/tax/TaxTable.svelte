<script lang="ts">
import type { TaxRow } from "../../lib/view/tax"
import Badge from "../ui/Badge.svelte"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rows: readonly TaxRow[]
	currency: string
}

let { rows, currency }: Props = $props()

const columns: readonly Column<TaxRow>[] = [
	{ key: "levy", header: "Tax rules", cell: levyCell },
	{ key: "period", header: "Period", cell: periodCell },
	{ key: "settles", header: "Due date", cell: settlesCell },
	{ key: "due", header: "Due before prepayment", numeric: true, cell: dueCell },
	{ key: "prepaid", header: "Prepaid", numeric: true, cell: prepaidCell },
	{ key: "owed", header: "Owed", numeric: true, cell: owedCell },
	{ key: "marks", header: "Marks", cell: marksCell },
]
</script>

{#snippet levyCell(row: TaxRow)}<code class="font-mono text-xs">{row.levy}</code>{/snippet}
{#snippet periodCell(row: TaxRow)}{row.period}{/snippet}
{#snippet settlesCell(row: TaxRow)}{row.settles}{/snippet}
{#snippet dueCell(row: TaxRow)}<Money amount={row.due} />{/snippet}
{#snippet prepaidCell(row: TaxRow)}<Money amount={row.prepaid} />{/snippet}

<!-- The owed figure with its sign kept; a negative one is labelled a refund, not a debt. -->
{#snippet owedCell(row: TaxRow)}
	<span class="inline-flex flex-wrap items-center justify-end gap-2">
		<Money amount={row.owed} />
		{#if row.refund}<Badge tone="accent">Refund</Badge>{/if}
	</span>
{/snippet}

{#snippet marksCell(row: TaxRow)}
	{#if !row.settled && !row.partial}
		<span class="text-muted-foreground">None</span>
	{:else}
		<span class="flex flex-wrap gap-1">
			{#if row.settled}<Badge>Settled</Badge>{/if}
			{#if row.partial}<Badge>Partial</Badge>{/if}
		</span>
	{/if}
{/snippet}

<!-- One row per Levy settlement period, with its figures, a refund in words, and its two marks. -->
<div class="space-y-3">
	<DataTable
		caption={`Tax years, figures in ${currency}`}
		{columns}
		{rows}
		rowKey={(row) => row.key}
	/>
	<dl class="space-y-1 text-sm text-muted-foreground">
		<div>
			<dt class="inline font-medium text-foreground">Settled:</dt>
			<dd class="inline">
				the settlement date falls inside the Projection, so its charge is included.
			</dd>
		</div>
		<div>
			<dt class="inline font-medium text-foreground">Partial:</dt>
			<dd class="inline">
				the Projection ended before the period did, so the period is incomplete.
			</dd>
		</div>
	</dl>
</div>

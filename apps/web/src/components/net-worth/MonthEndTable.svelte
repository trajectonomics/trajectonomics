<script lang="ts">
import type { MonthEndRow } from "../../lib/view/net-worth/history"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rows: readonly MonthEndRow[]
}

let { rows }: Props = $props()
const columns: Column<MonthEndRow>[] = [
	{ key: "month", header: "Month end", cell: monthCell },
	{ key: "net-worth", header: "Net worth", numeric: true, cell: netWorthCell },
]
</script>

{#snippet monthCell(row: MonthEndRow)}{row.asOf}{/snippet}
{#snippet netWorthCell(row: MonthEndRow)}
	{#if row.totals === null}
		<span class="text-destructive">{row.unstated ? "Not stated" : "Could not be read"} ({row.code})</span>
	{:else}
		{#each row.totals as total (total.currency)}
			<Money amount={total.amount} currency={total.currency} />
		{/each}
	{/if}
{/snippet}

<!-- The month-end history as a table: the accessible form of the chart, folded away by default. -->
<details class="rounded-lg border border-border p-4">
	<summary class="cursor-pointer text-sm font-medium">Month-end figures as a table</summary>
	<div class="mt-4">
		<DataTable
			caption="Net worth at each month-end"
			{rows}
			{columns}
			rowKey={(row) => String(row.index)}
		/>
	</div>
</details>

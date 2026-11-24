<script lang="ts">
import type { ChartTable } from "../../lib/view/charts/view"
import Money from "../ui/Money.svelte"

interface Props {
	table: ChartTable
	/** The chart's name, which names the table. */
	name: string
}

let { table, name }: Props = $props()
</script>

<!-- The text alternative to the chart: every plotted value in the CLI's own string, a row per year. -->
<details class="rounded-lg border border-border">
	<summary class="cursor-pointer px-3 py-2 text-sm font-medium">Values of {name}, as a table</summary>
	<div class="max-w-full overflow-auto">
		<table class="w-full min-w-max border-collapse text-sm">
			<thead>
				<tr>
					<th scope="col" class="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground">Year</th>
					{#each table.headers as header (header)}
						<th scope="col" class="border-b border-border px-3 py-2 text-right font-medium text-muted-foreground">{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each table.rows as row (row.label)}
					<tr class="border-b border-border last:border-0">
						<th scope="row" class="px-3 py-2 text-left font-normal">{row.label}</th>
						{#each row.cells as cell, index (index)}
							<td class="px-3 py-2 text-right tabular-nums">
								{#if cell === null}—{:else}<Money amount={cell} />{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</details>

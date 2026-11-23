<script lang="ts">
import type { YearRow } from "../../lib/view/what-if/years"
import FigureTriple from "./FigureTriple.svelte"

interface Props {
	rows: readonly YearRow[]
	/** The figures to show as columns, by the label the rows carry. */
	labels: readonly string[]
	caption: string
}

/** Each year's figures with the what-if value, the baseline and the CLI's change, one column per figure. */
let { rows, labels, caption }: Props = $props()
</script>

<!-- A year per row. The table scrolls inside its own wrapper, so the page never scrolls sideways. -->
<div class="max-h-[70vh] max-w-full overflow-auto rounded-lg border border-border">
	<table class="w-full min-w-max border-collapse text-sm">
		<caption class="px-3 py-2 text-left text-sm font-medium text-muted-foreground">{caption}</caption>
		<thead class="sticky top-0 z-10 bg-card">
			<tr>
				<th scope="col" class="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground">Period</th>
				{#each labels as label (label)}
					<th scope="col" class="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground">{label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.index)}
				<tr class="border-b border-border last:border-0">
					<th scope="row" class="px-3 py-2 text-left align-top font-normal whitespace-nowrap">{row.period}</th>
					{#each labels as label (label)}
						{@const triple = row.figures.find((entry) => entry.label === label)}
						<td class="px-3 py-2 align-top">
							{#if triple}<FigureTriple {triple} />{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

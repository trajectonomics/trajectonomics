<script lang="ts">
import type { Figure } from "../../lib/view/routing/figures"
import LineChart from "../chart/LineChart.svelte"

interface Props {
	/** What the chart shows, read out by a screen reader. */
	label: string
	figure: Figure | null
	/** The sentence shown when the run states nothing for the section. */
	empty: string
}

let { label, figure, empty }: Props = $props()
</script>

<!-- What the section did over the plan, one bar a year, every figure the CLI's. -->
{#if figure === null || figure.series.length === 0}
	<p class="text-sm text-muted-foreground">{empty}</p>
{:else}
	<div class="space-y-2">
		<LineChart {label} series={figure.series} kind="stacked-bars" />
		{#each figure.notes as note (note)}<p class="text-xs text-muted-foreground" data-cli>{note}</p>{/each}
	</div>
{/if}

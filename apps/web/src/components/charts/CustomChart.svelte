<script lang="ts">
import type { ChartDef } from "../../lib/view/charts/types"
import { KIND_LABELS } from "../../lib/view/charts/types"
import type { ChartView } from "../../lib/view/charts/view"
import LineChart from "../chart/LineChart.svelte"
import ChartTable from "./ChartTable.svelte"

interface Props {
	chart: ChartDef
	view: ChartView
	/** The chart's height in pixels. Left out, the default line chart's height. */
	height?: number
}

let { chart, view, height }: Props = $props()
const label = $derived(`${chart.name}, ${KIND_LABELS[chart.kind].toLowerCase()}, by year`)
</script>

<!-- A chart the person made: what the plan states, drawn; what it lacks, listed; every value in a table too. -->
<div class="space-y-3">
	{#if view.missing.length > 0}
		<div role="status" class="rounded-md border border-border p-3 text-sm">
			<p class="font-medium">Not on this plan, so not drawn:</p>
			<ul class="mt-1 list-disc pl-5">
				{#each view.missing as item (item.id)}<li>{item.name}: {item.reason}.</li>{/each}
			</ul>
		</div>
	{/if}
	{#if view.series.length > 0}
		<LineChart {label} series={view.series} kind={chart.kind} wide {height} />
		<ChartTable table={view.table} name={chart.name} />
	{:else}
		<p class="text-sm text-muted-foreground">Nothing to draw: this plan states none of the series of this chart.</p>
	{/if}
	{#each view.notes as note (note)}<p class="text-xs text-muted-foreground">{note}</p>{/each}
</div>

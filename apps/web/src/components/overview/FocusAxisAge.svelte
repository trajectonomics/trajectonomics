<script lang="ts">
import type { PlotBox } from "../../lib/view/overview/focus-chart-axis"

interface Props {
	plot: PlotBox
	height: number
	/** The first annual row's age, or its year when no age is stated. */
	first: string
	/** The last annual row's age, or its year when no age is stated. */
	last: string
}

/** The chart's only axis: the first and last ages, at the plot's two ends. The halo keeps the line off the words. */
let { plot, height, first, last }: Props = $props()
const HALO = "stroke-background [paint-order:stroke] stroke-[3px] print:stroke-background"
</script>

{#if first}
	<text
		x={plot.left}
		y={height - 6}
		class="{HALO} fill-muted-foreground text-xs print:fill-foreground">{first}</text
	>
{/if}
{#if last}
	<text
		x={plot.right}
		y={height - 6}
		text-anchor="end"
		class="{HALO} fill-muted-foreground text-xs print:fill-foreground">{last}</text
	>
{/if}

<script lang="ts">
import type { LineLayout, LineSeries, StepLine } from "../../lib/chart"
import LineLegend from "./LineLegend.svelte"
import { legendItems } from "./legend-items"

interface Props {
	layout: LineLayout
	series: readonly LineSeries[]
	step: StepLine | undefined
	/** Keeps the legend for screen readers, when each line's end already names it. */
	srOnly: boolean
}

/** The legend under a chart: a row for each series, and the step line's own when there is one. */
let { layout, series, step, srOnly }: Props = $props()
const items = $derived(
	legendItems(step ? [...series, step.line] : series, layout.palette === "wide"),
)
</script>

{#if series.length > 1 || step}
	<LineLegend {items} {srOnly} />
{/if}

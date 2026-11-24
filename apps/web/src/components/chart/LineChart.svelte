<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import {
	type ColumnKind,
	columnLayout,
	type LineMarker,
	type LineSeries,
	lineLayout,
} from "../../lib/chart"
import EmptyState from "../ui/EmptyState.svelte"
import { HEIGHT, MARGIN } from "./geometry"
import LineHover from "./LineHover.svelte"
import LineLegend from "./LineLegend.svelte"
import { legendItems } from "./legend-items"

/** The narrowest a chart is drawn, so its axis labels never collide. */
const MIN_WIDTH = 240
/** The width before the chart is measured, which is also what a prerender would show. */
const FALLBACK_WIDTH = 640

interface Props {
	/** What the chart shows, read out by a screen reader, such as "Net worth by month". */
	label: string
	series: readonly LineSeries[]
	/** Vertical rules with a label, such as the Milestones a plan reached. Each sits at its own x; in a bar chart, inside the bar of its period. */
	markers?: readonly LineMarker[]
	/** Whether the values are money. Money hides under the hide-amounts switch; other values do not. */
	money?: boolean
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	hidden?: boolean
	/** How the series are drawn. Left out, each is a line; the others are the column charts of the custom charts. */
	kind?: "line" | ColumnKind
	/** Draws the series from the longer palette, for a chart of many series. A column chart always does. */
	wide?: boolean
}

let {
	label,
	series,
	markers = [],
	money = true,
	hidden,
	kind = "line",
	wide = false,
}: Props = $props()
let clientWidth = $state(0)
let active = $state<number | null>(null)
const width = $derived(
	clientWidth > 0 ? Math.max(MIN_WIDTH, Math.floor(clientWidth)) : FALLBACK_WIDTH,
)
const masked = $derived((hidden ?? preferences.hidden) && money)
const plot = $derived({ width, height: HEIGHT, margin: MARGIN })
const layout = $derived(
	kind === "line"
		? lineLayout(series, plot, markers, wide ? "wide" : undefined)
		: columnLayout(series, plot, kind, markers),
)
</script>

<!--
	A line chart. Hover, and the arrow keys once it has focus, show a crosshair and a tooltip with every
	series' string as the CLI printed it. Its axis labels are round tick values, abbreviated, and hide with
	the amounts.
-->
<div bind:clientWidth class="w-full">
	{#if layout}
		<LineHover
			{label}
			{layout}
			{width}
			{masked}
			{active}
			onActive={(index) => (active = index)}
		/>
	{:else}
		<EmptyState title="Nothing to chart yet" />
	{/if}
	{#if layout && series.length > 1}
		<LineLegend items={legendItems(series, layout.palette === "wide")} />
	{/if}
</div>

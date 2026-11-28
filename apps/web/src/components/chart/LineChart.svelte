<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import {
	type ColumnKind,
	columnLayout,
	columnXs,
	type LineMarker,
	type LineSeries,
	endLabels as lineEndLabels,
	lineLayout,
	type StepLine,
	withStepLine,
} from "../../lib/chart"
import EmptyState from "../ui/EmptyState.svelte"
import { FALLBACK_WIDTH, HEIGHT, MARGIN, MIN_WIDTH, RIGHT_AXIS_MARGIN, SUB_LINE } from "./geometry"
import LineChartLegend from "./LineChartLegend.svelte"
import LineHover from "./LineHover.svelte"

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
	/** A column chart's step line on a second axis on the right, such as the rate of each period. Left out, there is none. */
	step?: StepLine | undefined
	/** The chart's height in pixels. Left out, the default line chart's height. */
	height?: number | undefined
	/** Places each series' short name at its line's end, and keeps the legend for screen readers. */
	endLabels?: boolean
}

let {
	label,
	series,
	markers = [],
	money = true,
	hidden,
	kind = "line",
	wide = false,
	step,
	height,
	endLabels = false,
}: Props = $props()
let clientWidth = $state(0)
let active = $state<number | null>(null)
const width = $derived(
	clientWidth > 0 ? Math.max(MIN_WIDTH, Math.floor(clientWidth)) : FALLBACK_WIDTH,
)
const masked = $derived((hidden ?? preferences.hidden) && money)
const subLine = $derived(series.some((line) => line.points.some((point) => point.subLabel)))
const chartHeight = $derived(height ?? HEIGHT)
const plot = $derived({
	width,
	height: chartHeight,
	margin: {
		...MARGIN,
		...(step ? { right: RIGHT_AXIS_MARGIN } : {}),
		...(subLine ? { bottom: MARGIN.bottom + SUB_LINE } : {}),
	},
})
const columns = $derived(kind === "line" ? null : columnLayout(series, plot, kind, markers))
const layout = $derived(
	kind === "line"
		? lineLayout(series, plot, markers, wide ? "wide" : undefined)
		: columns && step
			? withStepLine(columns, step, columnXs(series), plot)
			: columns,
)
const ends = $derived(endLabels && layout ? lineEndLabels(layout, series, plot) : null)
</script>

<!-- A line chart with hover, keyboard and abbreviated axis labels, and a tooltip of each series' own string. -->
<div bind:clientWidth class="w-full">
	{#if layout}
		<LineHover
			{label}
			{layout}
			{width}
			height={chartHeight}
			{masked}
			{active}
			labels={ends}
			onActive={(index) => (active = index)}
		/>
		<LineChartLegend {layout} {series} {step} srOnly={ends !== null} />
	{:else}
		<EmptyState title="Nothing to chart yet" />
	{/if}
</div>

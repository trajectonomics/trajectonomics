<script lang="ts">
import type { LineLayout } from "../../lib/chart"
import LineAxis from "./LineAxis.svelte"
import LineMarks from "./LineMarks.svelte"
import LineRules from "./LineRules.svelte"
import { dashPattern, fillClass, fillOpacity, strokeClass } from "./series-style"

interface Props {
	label: string
	layout: LineLayout
	width: number
	/** The chart's height in pixels. */
	height: number
	/** Whether the y labels are money and hidden. */
	masked: boolean
	/** The hovered index, or null. */
	index: number | null
}

let { label, layout, width, height, masked, index }: Props = $props()

/** The room a date label needs on each side of its tick, so the last one is not cut off at the edge. */
const HALF_LABEL = 36

/** Whether a second line of labels (the ages) sits under the dates, which lifts the dates by a line. */
const stacked = $derived(layout.xTicks.some((tick) => tick.sub !== undefined))

/** A label is centred on its tick, except near an edge, where it ends or starts there instead. */
function anchorAt(x: number): "start" | "middle" | "end" {
	if (x + HALF_LABEL > width) return "end"
	return x - HALF_LABEL < 0 ? "start" : "middle"
}
</script>

<!-- The chart drawn as one SVG: the grid, the axis labels, every series and the hover marks. -->
<svg
	role="img"
	aria-label={label}
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	class="block h-auto w-full"
>
	<LineAxis {layout} {width} {masked} />
	{#each layout.xTicks as tick (tick.index)}
		<text
			x={layout.xPixels[tick.index]}
			y={stacked ? height - 22 : height - 8}
			text-anchor={anchorAt(layout.xPixels[tick.index] ?? 0)}
			class="fill-muted-foreground text-xs">{tick.label}</text
		>
		{#if tick.sub !== undefined}
			<text
				x={layout.xPixels[tick.index]}
				y={height - 8}
				text-anchor={anchorAt(layout.xPixels[tick.index] ?? 0)}
				class="fill-muted-foreground text-xs">{tick.sub}</text
			>
		{/if}
	{/each}
	{#each layout.series as line, seriesIndex (seriesIndex)}
		{#if line.area}
			<path d={line.area} class={fillClass(seriesIndex)} fill-opacity={fillOpacity(seriesIndex)} />
		{/if}
		{#each line.bars ?? [] as bar, column (column)}
			{#if bar}
				<rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} class={fillClass(seriesIndex)} fill-opacity={fillOpacity(seriesIndex, bar.faded)} />
			{/if}
		{/each}
		<path
			d={line.path}
			fill="none"
			stroke-width={2}
			stroke-linejoin="round"
			stroke-linecap="round"
			stroke-dasharray={dashPattern(line.dashed, line.dotted)}
			class={strokeClass(seriesIndex, layout.palette === "wide")}
		/>
	{/each}
	<LineRules {layout} {width} {height} />
	{#if index !== null}
		<LineMarks {layout} {index} {height} />
	{/if}
</svg>

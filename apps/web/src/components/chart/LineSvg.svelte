<script lang="ts">
import type { LineLayout } from "../../lib/chart"
import { abbreviate, maskMoney } from "../../lib/format"
import { HEIGHT, MARGIN } from "./geometry"
import LineMarks from "./LineMarks.svelte"
import LineRules from "./LineRules.svelte"
import { dashPattern, fillClass, fillOpacity, strokeClass } from "./series-style"

interface Props {
	label: string
	layout: LineLayout
	width: number
	/** Whether the y labels are money and hidden. */
	masked: boolean
	/** The hovered index, or null. */
	index: number | null
}

let { label, layout, width, masked, index }: Props = $props()
</script>

<!-- The chart drawn as one SVG: the grid, the axis labels, every series and the hover marks. -->
<svg
	role="img"
	aria-label={label}
	{width}
	height={HEIGHT}
	viewBox="0 0 {width} {HEIGHT}"
	class="block h-auto w-full"
>
	{#each layout.yTicks as tick (tick.value)}
		<line
			x1={MARGIN.left}
			x2={width - MARGIN.right}
			y1={tick.y}
			y2={tick.y}
			class="stroke-border"
		/>
		<text
			x={MARGIN.left - 8}
			y={tick.y}
			text-anchor="end"
			dominant-baseline="middle"
			class="fill-muted-foreground text-xs tabular-nums"
			>{masked ? maskMoney(abbreviate(tick.value)) : abbreviate(tick.value)}</text
		>
	{/each}
	{#each layout.xTicks as tick (tick.index)}
		<text
			x={layout.xPixels[tick.index]}
			y={HEIGHT - 8}
			text-anchor="middle"
			class="fill-muted-foreground text-xs">{tick.label}</text
		>
	{/each}
	{#each layout.series as line, seriesIndex (line.name)}
		{#if line.area}
			<path d={line.area} class={fillClass(seriesIndex)} fill-opacity={fillOpacity(seriesIndex)} />
		{/if}
		{#each line.bars ?? [] as bar, column (column)}
			{#if bar}
				<rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} class={fillClass(seriesIndex)} fill-opacity={fillOpacity(seriesIndex)} />
			{/if}
		{/each}
		<path
			d={line.path}
			fill="none"
			stroke-width={2}
			stroke-linejoin="round"
			stroke-linecap="round"
			stroke-dasharray={dashPattern(line.dashed ?? false)}
			class={strokeClass(seriesIndex, layout.palette === "wide")}
		/>
	{/each}
	<LineRules {layout} {width} />
	{#if index !== null}
		<LineMarks {layout} {index} />
	{/if}
</svg>

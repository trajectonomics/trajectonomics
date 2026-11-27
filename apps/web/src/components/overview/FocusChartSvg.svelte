<script lang="ts">
import type { FocusView } from "../../lib/view/overview/focus"
import { type FocusChartGeometry, placeholderPath } from "../../lib/view/overview/focus-chart"
import FocusAxisAge from "./FocusAxisAge.svelte"
import FocusBar from "./FocusBar.svelte"
import FocusFlag from "./FocusFlag.svelte"

interface Props {
	focus: FocusView
	chart: FocusChartGeometry
	width: number
	height: number
	/** The shortfall, compact and masked when amounts are hidden. */
	unmet: string
	firstAge: string
	lastAge: string
}

/** The focus point's SVG: the line and its fills, the stop, the flag or the bar, and the first and last age. */
let { focus, chart, width, height, unmet, firstAge, lastAge }: Props = $props()
</script>

<svg
	data-focus-chart
	aria-hidden="true"
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	preserveAspectRatio="none"
	class="block w-full"
>
	{#if focus.kind === "setup"}
		<path
			d={placeholderPath(chart.plot)}
			fill="none"
			stroke-width="2"
			stroke-dasharray="6 4"
			class="stroke-muted-foreground print:stroke-foreground"
		/>
	{:else}
		{#if chart.accent}
			<path
				d={chart.accent.area}
				fill-opacity={focus.kind === "runsOut" ? 0.08 : 0.16}
				class="fill-accent print:fill-foreground print:[fill-opacity:0.2]"
			/>
			<path
				d={chart.accent.line}
				data-focus-line
				fill="none"
				stroke-width="2"
				stroke-linejoin="round"
				class="stroke-accent print:stroke-foreground"
			/>
		{/if}
		<path d={chart.foreground.area} fill-opacity="0.06" class="fill-foreground" />
		<path
			d={chart.foreground.line}
			data-focus-line
			fill="none"
			stroke-width="2"
			stroke-linejoin="round"
			class="stroke-foreground"
		/>
	{/if}
	{#if chart.stop}
		<line
			x1={chart.stop.x}
			y1={chart.plot.top}
			x2={chart.stop.x}
			y2={chart.zeroY}
			stroke-width="1"
			stroke-dasharray="4 4"
			class="stroke-foreground"
		/>
		<circle cx={chart.stop.x} cy={chart.stop.y} r="3.5" class="fill-accent print:fill-foreground" />
	{/if}
	{#if focus.kind === "reachable" && chart.flag}
		<FocusFlag
			x={chart.flag.x}
			y={chart.flag.y}
			year={focus.horizonYear ?? ""}
			points={chart.points}
			plot={chart.plot}
		/>
	{/if}
	{#if focus.kind === "runsOut" && chart.bar}
		<FocusBar bar={chart.bar} {unmet} />
	{/if}
	<FocusAxisAge plot={chart.plot} {height} first={firstAge} last={lastAge} />
</svg>

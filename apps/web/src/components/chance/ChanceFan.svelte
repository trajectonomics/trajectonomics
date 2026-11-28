<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { fanOf, type LineSeries, lineLayout } from "../../lib/chart"
import { abbreviate, maskMoney } from "../../lib/format"
import { fanEnds } from "../../lib/view/chance/fan-ends"
import { HEIGHT, MARGIN } from "../chart/geometry"
import EmptyState from "../ui/EmptyState.svelte"

/** The narrowest the fan is drawn, so its axis labels never collide. */
const MIN_WIDTH = 240
/** The width before the fan is measured, which is also what a prerender would show. */
const FALLBACK_WIDTH = 640

interface Props {
	/** What the chart shows, read out by a screen reader. */
	label: string
	/** The five Percentile series of the fan, from the chance view. */
	series: readonly LineSeries[]
}

/** The net-worth fan: the 10–90 and 25–75 bands shaded, and the median line, one column per roll-up. */
let { label, series }: Props = $props()
let clientWidth = $state(0)
const width = $derived(
	clientWidth > 0 ? Math.max(MIN_WIDTH, Math.floor(clientWidth)) : FALLBACK_WIDTH,
)
const layout = $derived(lineLayout(series, { width, height: HEIGHT, margin: MARGIN }))
const fan = $derived(layout === null ? null : fanOf(layout))

const ends = $derived(layout === null ? [] : fanEnds(layout))
</script>

<div bind:clientWidth class="w-full">
	{#if layout && fan}
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
					>{preferences.hidden ? maskMoney(abbreviate(tick.value)) : abbreviate(tick.value)}</text
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
			<path d={fan.outer} class="fill-accent/20" />
			<path d={fan.inner} class="fill-accent/45" />
			<path
				d={fan.median}
				fill="none"
				stroke-width={2}
				stroke-linejoin="round"
				stroke-linecap="round"
				class="stroke-foreground"
			/>
			{#each ends as end (end.text)}
				<text
					x={width - MARGIN.right - 4}
					y={end.y}
					text-anchor="end"
					dominant-baseline="middle"
					aria-hidden="true"
					class="fill-foreground stroke-background stroke-[3px] text-[11px] [paint-order:stroke] print:stroke-background"
					>{end.text}</text
				>
			{/each}
		</svg>
	{:else}
		<EmptyState title="Nothing to chart yet" />
	{/if}
</div>

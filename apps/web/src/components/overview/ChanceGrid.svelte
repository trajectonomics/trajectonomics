<script lang="ts">
import { chanceGridLayout } from "../../lib/view/chance/grid-layout"
import type { FocusCounts } from "../../lib/view/overview/focus"

interface Props {
	counts: FocusCounts
	/**
	 * "sm" is the card's row of hairline squares, with the counts beside it. "lg" is the focus point's picture:
	 * one square per path in a fixed 240px frame, so 10,000 paths take no more room than 200. The page writes
	 * the percent and the counts beside it.
	 */
	size?: "sm" | "lg"
}

/** The markets the answer held on: one square each, the first ones filled. The heading says the counts. */
let { counts, size = "sm" }: Props = $props()
const squares = $derived(Array.from({ length: counts.paths }, (_, index) => index))
/** The focus grid's own box: 1000 units wide and 240 tall, scaled to the page's width by the SVG. */
const BOX = { width: 1000, height: 240 }
const layout = $derived(chanceGridLayout(counts.paths, BOX.width, BOX.height))
/** One square's top-left corner, centred in its cell. */
function squareAt(index: number): { x: number; y: number } {
	const column = index % layout.cols
	const row = Math.floor(index / layout.cols)
	return {
		x: layout.x + column * layout.cell + layout.gap / 2,
		y: layout.y + row * layout.cell + layout.gap / 2,
	}
}
</script>

{#if size === "lg"}
	<svg
		aria-hidden="true"
		viewBox="0 0 {BOX.width} {BOX.height}"
		preserveAspectRatio="xMidYMid meet"
		class="block h-[240px] w-full"
	>
		{#each squares as index (index)}
			{@const at = squareAt(index)}
			<rect
				x={at.x}
				y={at.y}
				width={layout.size}
				height={layout.size}
				vector-effect="non-scaling-stroke"
				stroke-width="1"
				class={index < counts.succeeded
					? "fill-accent print:fill-foreground/20"
					: "fill-none stroke-muted-foreground/40"}
			/>
		{/each}
	</svg>
{:else}
	<div aria-hidden="true" class="flex max-w-full min-w-0 flex-wrap items-center gap-3">
		<div class="grid max-w-full gap-px grid-cols-[repeat(50,minmax(0,4px))]">
			{#each squares as index (index)}
				<span
					class={index < counts.succeeded
						? "size-1 bg-accent print:bg-foreground/20"
						: "size-1 border border-muted-foreground/40"}
				></span>
			{/each}
		</div>
		<p class="whitespace-nowrap tabular-nums">
			<span class="text-xl font-semibold">{counts.succeeded}</span><span
				class="text-xs text-muted-foreground">/{counts.paths}</span
			>
		</p>
	</div>
{/if}

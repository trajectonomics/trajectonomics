<script lang="ts">
import type { LineLayout } from "../../lib/chart"
import { HEIGHT, MARGIN } from "./geometry"
import { strokeClass } from "./series-style"

interface Props {
	layout: LineLayout
	/** The index of the hovered x. */
	index: number
}

let { layout, index }: Props = $props()
const x = $derived(layout.xPixels[index])
</script>

<!-- The crosshair at the hovered x, and a dot on each series that has a value there. -->
{#if x !== undefined}
	<g>
		<line
			x1={x}
			x2={x}
			y1={MARGIN.top}
			y2={HEIGHT - MARGIN.bottom}
			stroke-dasharray="2 3"
			class="stroke-muted-foreground"
		/>
		{#each layout.series as line, seriesIndex (line.name)}
			{#if line.marks[index]}
				<circle
					cx={line.marks[index].x}
					cy={line.marks[index].y}
					r={4}
					stroke-width={2}
					class={`fill-background ${strokeClass(seriesIndex, layout.palette === "wide")}`}
				/>
			{/if}
		{/each}
	</g>
{/if}

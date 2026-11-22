<script lang="ts">
import type { LineLayout } from "../../lib/chart"
import { HEIGHT, MARGIN } from "./geometry"

interface Props {
	layout: LineLayout
	width: number
}

let { layout, width }: Props = $props()
</script>

<!-- A vertical rule at each marker, labelled at its top. A label past the middle hangs to the left of its rule. -->
{#each layout.markers as marker, index (index)}
	{@const hangLeft = marker.x > width / 2}
	<g>
		<title>{marker.label}</title>
		<line
			x1={marker.x}
			x2={marker.x}
			y1={MARGIN.top}
			y2={HEIGHT - MARGIN.bottom}
			stroke-dasharray="4 3"
			class="stroke-foreground"
		/>
		<text
			x={hangLeft ? marker.x - 4 : marker.x + 4}
			y={MARGIN.top + 10}
			text-anchor={hangLeft ? "end" : "start"}
			class="fill-foreground text-xs">{marker.label}</text
		>
	</g>
{/each}

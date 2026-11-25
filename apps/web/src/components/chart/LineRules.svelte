<script lang="ts">
import { type LineLayout, labelRows } from "../../lib/chart"
import { HEIGHT, MARGIN } from "./geometry"

interface Props {
	layout: LineLayout
	width: number
}

let { layout, width }: Props = $props()
/** Each label's row, so labels on the same or nearby dates never overlap. */
const rows = $derived(labelRows(layout.markers, width))
/** The height of one label row, in pixels. */
const ROW_PX = 14
</script>

<!-- A vertical rule at each marker, labelled near its top. A label past the middle hangs to the left of its
rule, and a label that would overlap an earlier one moves down a row. -->
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
			y={MARGIN.top + 10 + (rows[index] ?? 0) * ROW_PX}
			text-anchor={hangLeft ? "end" : "start"}
			class="fill-foreground {marker.code === true ? 'font-mono text-[11px]' : 'text-xs'}">{marker.label}</text
		>
	</g>
{/each}

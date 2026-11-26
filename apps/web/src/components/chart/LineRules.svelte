<script lang="ts">
import { LABEL_OFFSET_PX, type LineLayout, placedLabels } from "../../lib/chart"
import { HEIGHT, MARGIN } from "./geometry"

interface Props {
	layout: LineLayout
	width: number
}

let { layout, width }: Props = $props()
/** Each label's row, side and words, so none overlaps another, crosses a rule or leaves the plot. */
const labels = $derived(
	placedLabels(layout.markers, {
		width,
		left: MARGIN.left,
		right: layout.rightAxis?.edge ?? width - MARGIN.right,
	}),
)
/** The height of one label row, in pixels. */
const ROW_PX = 14
</script>

<!-- A vertical rule at each marker, labelled near its top. A label past the middle hangs to the left of its
rule, one that would overlap an earlier label moves down a row, and one that would cross another rule or leave
the plot is moved whole to the other side, shortened on the roomier one, or left to the list under the chart. -->
{#each layout.markers as marker, index (index)}
	{@const label = labels[index]}
	<g>
		<title>{marker.label}</title>
		<line
			data-marker-rule
			x1={marker.x}
			x2={marker.x}
			y1={MARGIN.top}
			y2={HEIGHT - MARGIN.bottom}
			stroke-dasharray="4 3"
			class="stroke-foreground"
		/>
		{#if label !== undefined && label.text !== ""}
			<text
				data-marker-label
				x={marker.x + (label.leftwards ? -LABEL_OFFSET_PX : LABEL_OFFSET_PX)}
				y={MARGIN.top + 10 + label.row * ROW_PX}
				text-anchor={label.leftwards ? "end" : "start"}
				class="fill-foreground {marker.code === true ? 'font-mono text-[11px]' : 'text-xs'}">{label.text}</text
			>
		{/if}
	</g>
{/each}

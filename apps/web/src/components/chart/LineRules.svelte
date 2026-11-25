<script lang="ts">
import { hangsLeft, type LineLayout, placedLabels } from "../../lib/chart"
import { HEIGHT, MARGIN } from "./geometry"

interface Props {
	layout: LineLayout
	width: number
}

let { layout, width }: Props = $props()
/** Each label's row and the words that fit before the next rule, so none overlaps another or crosses a rule. */
const labels = $derived(placedLabels(layout.markers, width))
/** The height of one label row, in pixels. */
const ROW_PX = 14
</script>

<!-- A vertical rule at each marker, labelled near its top. A label past the middle hangs to the left of its
rule, one that would overlap an earlier label moves down a row, and one that would cross another rule is
shortened with an ellipsis. -->
{#each layout.markers as marker, index (index)}
	{@const left = hangsLeft(marker.x, width)}
	{@const label = labels[index] ?? { row: 0, text: marker.label }}
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
			x={left ? marker.x - 4 : marker.x + 4}
			y={MARGIN.top + 10 + label.row * ROW_PX}
			text-anchor={left ? "end" : "start"}
			class="fill-foreground {marker.code === true ? 'font-mono text-[11px]' : 'text-xs'}">{label.text}</text
		>
	</g>
{/each}

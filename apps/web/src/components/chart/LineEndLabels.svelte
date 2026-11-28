<script lang="ts">
import type { EndLabel } from "../../lib/chart"

interface Props {
	labels: readonly EndLabel[]
}

/** Each series' short name at its line's end, on a halo so the line does not run through the words. */
let { labels }: Props = $props()
const HALO = "stroke-background [paint-order:stroke] stroke-[3px] print:stroke-background"
</script>

{#each labels as label (label.index)}
	<text
		x={label.x}
		y={label.y}
		text-anchor={label.anchor}
		aria-hidden="true"
		class="fill-foreground text-xs {HALO}">{label.text}</text
	>
{/each}

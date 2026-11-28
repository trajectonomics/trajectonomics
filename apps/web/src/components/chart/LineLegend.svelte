<script lang="ts">
import { dashPattern } from "./series-style"
import type { LegendItem } from "./types"

interface Props {
	items: readonly LegendItem[]
	/** Keeps the legend off the screen but in the page, when each line's end already names it. */
	srOnly?: boolean
}

let { items, srOnly = false }: Props = $props()
</script>

<!-- The series of a chart, each with a swatch that shows its dash as well as its colour. -->
<ul class={srOnly ? "sr-only" : "mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"}>
	{#each items as item, index (index)}
		<li class="flex items-center gap-2">
			<svg width={24} height={8} aria-hidden="true" focusable="false">
				<line
					x1={0}
					x2={24}
					y1={4}
					y2={4}
					stroke-width={2}
					stroke-dasharray={dashPattern(item.dashed, item.dotted)}
					class={item.stroke}
				/>
			</svg>
			<span>{item.name}</span>
		</li>
	{/each}
</ul>

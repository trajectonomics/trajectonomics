<script lang="ts">
import { dashPattern } from "./series-style"
import type { LegendItem } from "./types"

interface Props {
	items: readonly LegendItem[]
}

let { items }: Props = $props()
</script>

<!-- The series of a chart, each with a swatch that shows its dash as well as its colour. -->
<ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
	{#each items as item (item.name)}
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

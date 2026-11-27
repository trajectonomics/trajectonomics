<script lang="ts">
import type { TooltipRow } from "./types"

interface Props {
	/** The x of the hovered point, in pixels from the chart's left edge. */
	x: number
	width: number
	xLabel: string
	rows: readonly TooltipRow[]
}

let { x, width, xLabel, rows }: Props = $props()
/** A tooltip sits to the right of the crosshair, or to its left past the middle, so it stays inside. */
const flip = $derived(x > width / 2)
</script>

<div
	role="presentation"
	class="pointer-events-none absolute top-2 z-10 min-w-40 rounded-md border border-border bg-popover p-2 text-sm text-popover-foreground shadow-sm"
	style:left="{x}px"
	style:transform={flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)"}
>
	<p class="font-medium">{xLabel}</p>
	<ul class="mt-1 space-y-0.5">
		{#each rows as row, index (index)}
			<li class="flex items-baseline justify-between gap-3 tabular-nums">
				<span class="text-muted-foreground">{row.name}</span>
				<span>{row.display}</span>
			</li>
		{/each}
	</ul>
</div>

<script lang="ts">
import { barHeights } from "../../lib/chart"
import type { RunsOutBar } from "../../lib/view/chance/page"

/** The height of the tallest bar, in pixels. */
const BAR_HEIGHT = 96

interface Props {
	/** One bar per annual roll-up, in order: the failing paths that first run out in it. */
	bars: readonly RunsOutBar[]
	/** What the row shows, read out by a screen reader. */
	label: string
}

let { bars, label }: Props = $props()
const heights = $derived(
	barHeights(
		bars.map((bar) => bar.paths),
		BAR_HEIGHT,
	),
)
</script>

<!-- One bar per roll-up: the failing Market paths whose Runs-out falls in it. Zero draws no bar. -->
<figure class="space-y-2">
	<figcaption class="sr-only">{label}</figcaption>
	<div class="flex items-end gap-[3px]" style="height: {BAR_HEIGHT}px">
		{#each bars as bar, index (index)}
			<div class="min-w-[4px] flex-1 rounded-t bg-accent" style="height: {heights[index]}px" title={bar.title}></div>
		{/each}
	</div>
	<div class="flex gap-[3px] text-xs text-muted-foreground">
		{#each bars as bar, index (index)}
			<span class="min-w-[4px] flex-1 text-center whitespace-nowrap">{bar.label ?? ""}</span>
		{/each}
	</div>
</figure>

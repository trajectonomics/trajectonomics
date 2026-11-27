<script lang="ts">
import type { BandsView } from "../../lib/view/withdrawals/bands"
import ChanceFan from "../chance/ChanceFan.svelte"
import Money from "../ui/Money.svelte"

interface Props {
	bands: BandsView
	currency: string
}

/** What the rule pays across seeded Market paths: the chance of success, the spending Bands, and the lowest year. */
let { bands, currency }: Props = $props()
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<h4 class="text-sm font-medium">What the rule pays each year, across the paths</h4>
		<p class="text-sm text-muted-foreground">The shaded areas are the 10th to 90th and the 25th to 75th Percentiles of what a year pays; the line is the middle path. Future money.</p>
		<ChanceFan label="What the rule pays each year, from the 10th to the 90th Percentile" series={bands.series} />
	</div>
	<div class="space-y-2">
		<h4 class="text-sm font-medium">In the worst years you would spend</h4>
		<p class="text-sm text-muted-foreground">
			The lowest whole year of each path. It counts {bands.counted} of {bands.paths} paths: a part year does not count, and a path that ran out counts 0.
		</p>
		{#if bands.lowest.length === 0}
			<p class="text-sm">No path has a whole year of spending.</p>
		{:else}
			<dl class="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm sm:max-w-md">
				{#each bands.lowest as one (one.level)}
					<dt class="text-muted-foreground">{one.words}</dt>
					<dd class="text-right"><Money amount={one.amount} {currency} /></dd>
				{/each}
			</dl>
		{/if}
	</div>
</div>

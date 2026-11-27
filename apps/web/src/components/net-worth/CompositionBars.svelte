<script lang="ts">
import type { CurrencyBar } from "../../lib/view/net-worth/composition"
import CompositionBar from "../chart/CompositionBar.svelte"

interface Props {
	bars: readonly CurrencyBar[]
	/** A card's short form of each legend amount, truncated toward zero. */
	compact?: boolean
}

let { bars, compact = false }: Props = $props()
</script>

<!-- The assets by account, one bar per currency. Empty when no asset account has a row. -->
{#if bars.length === 0}
	<p class="text-sm text-muted-foreground">No asset accounts.</p>
{:else}
	<div class="space-y-6">
		{#each bars as bar (bar.currency)}
			<CompositionBar
				label={`Assets by account, ${bar.currency}`}
				segments={bar.segments}
				currency={bar.currency}
				{compact}
			/>
		{/each}
	</div>
{/if}

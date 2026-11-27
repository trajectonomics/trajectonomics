<script lang="ts">
import type { CurrencyTotal } from "../../lib/contract"
import { cx } from "./cx"
import Money from "./Money.svelte"

interface Props {
	totals: readonly CurrencyTotal[]
	/** Sets the size of the figures. Defaults to the body size. */
	className?: string
	/** A card's short form of each figure, truncated toward zero. */
	compact?: boolean
}

let { totals, className, compact = false }: Props = $props()
</script>

{#if totals.length === 0}
	<p class="text-muted-foreground">No total</p>
{:else}
	<span class={cx("flex flex-col gap-1", className)}>
		{#each totals as total (total.currency)}
			<Money amount={total.amount} currency={total.currency} {compact} />
		{/each}
	</span>
{/if}

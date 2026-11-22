<script lang="ts">
import type { CurrencyTotal } from "../../lib/contract"
import { cx } from "./cx"
import Money from "./Money.svelte"

interface Props {
	totals: readonly CurrencyTotal[]
	/** Sets the size of the figures. Defaults to the body size. */
	className?: string
}

let { totals, className }: Props = $props()
</script>

{#if totals.length === 0}
	<p class="text-muted-foreground">No total</p>
{:else}
	<span class={cx("flex flex-col gap-1", className)}>
		{#each totals as total (total.currency)}
			<Money amount={total.amount} currency={total.currency} />
		{/each}
	</span>
{/if}

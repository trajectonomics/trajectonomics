<script lang="ts">
import { type EstateFigures, shownUnder } from "../../lib/view/estate/figures"
import type { Terms } from "../../lib/view/projection/terms"
import Money from "../ui/Money.svelte"

interface Props {
	figures: EstateFigures
	terms: Terms
}

/** The headline: what heirs receive first, then where the rest goes. Each amount is the CLI's, and only two are stated in today's money. */
let { figures, terms }: Props = $props()
const keys = ["heirs", "gross", "debts", "costs", "net", "gifts"]
const items = $derived(keys.flatMap((key) => figures.items.filter((item) => item.key === key)))
</script>

<dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each items as item (item.key)}
		{@const shown = shownUnder(item, terms)}
		<div>
			<dt class="text-sm text-muted-foreground">{item.label}{#if shown.tag} <span class="text-xs">({shown.tag.toLowerCase()})</span>{/if}</dt>
			<dd class="mt-1 text-lg font-semibold tracking-tight tabular-nums">
				<Money amount={shown.amount} currency={figures.currency} signed />
			</dd>
			{#if shown.aside !== null}
				<dd class="text-sm text-muted-foreground">In today's money <Money amount={shown.aside} /></dd>
			{/if}
		</div>
	{/each}
</dl>

<script lang="ts">
import type { LoanCard } from "../../lib/view/plan-items/loans"
import Money from "../ui/Money.svelte"

interface Props {
	cards: readonly LoanCard[]
	currency: string
}

let { cards, currency }: Props = $props()
</script>

<section class="space-y-3" aria-label="Other loan Flows">
	<h2 class="font-semibold">Other loan Flows</h2>
	<p class="text-sm text-muted-foreground">Read-only: a withdrawal or a payment that is not part of a loan the form edits.</p>
	<ul class="grid gap-3 sm:grid-cols-2">
		{#each cards as card (card.id)}
			<li class="rounded-lg border border-border bg-card p-4">
				<h3 class="font-semibold break-all">{card.id}</h3>
				<p class="text-sm text-muted-foreground">{card.title}</p>
				<p class="mt-2 text-lg">
					{#if card.amount !== null}
						<Money amount={card.amount} {currency} />
					{:else}
						<span class="text-muted-foreground">computed</span>
					{/if}
				</p>
				<p class="text-xs text-muted-foreground">{card.amountLabel}</p>
				<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
					{#each card.rows as row (row.label)}
						<dt class="text-muted-foreground">{row.label}</dt>
						<dd>{row.value}</dd>
					{/each}
				</dl>
			</li>
		{/each}
	</ul>
</section>

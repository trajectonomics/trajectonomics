<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import type { FutureCard } from "../../lib/view/chance/futures"
import { futureHref } from "../../lib/view/chance/links"
import { MONEY_LABELS } from "../../lib/view/chance/money"
import Money from "../ui/Money.svelte"
import FutureOutcome from "./FutureOutcome.svelte"

interface Props {
	cards: readonly FutureCard[]
	/** The plan the futures belong to: each link names it. */
	plan: string
	/** Whether each card says its figures are in future money. */
	futureMoney: boolean
}

/** The CLI's picks of the futures to open first, each with the figures the table shows. */
let { cards, plan, futureMoney }: Props = $props()
</script>

<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
	{#each cards as card (card.title)}
		<li class="flex flex-col rounded-lg border border-border bg-card p-4">
			<h3 class="text-sm font-semibold">{card.title}</h3>
			{#if futureMoney}<p class="text-xs text-muted-foreground">{MONEY_LABELS.future}</p>{/if}
			<p class="mt-1 text-sm"><FutureOutcome future={card.future} /></p>
			<dl class="mt-3 space-y-1 text-sm">
				<div class="flex justify-between gap-3">
					<dt class="text-muted-foreground">Closing net worth</dt>
					<dd><Money amount={card.future.closing} signed /></dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted-foreground">Lowest point</dt>
					<dd><Money amount={card.future.lowest} signed /></dd>
				</div>
			</dl>
			<a
				href={futureHref(currentSearch(), plan, card.future.index)}
				class="mt-3 text-sm text-accent underline-offset-4 hover:underline"
				>Open future {card.future.index}<span class="sr-only">, {card.title}</span></a
			>
		</li>
	{/each}
</ul>

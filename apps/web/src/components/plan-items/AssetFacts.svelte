<script lang="ts">
import { formatDate } from "../../lib/format"
import type { AssetCardView } from "../../lib/view/plan-items/asset-card"
import Money from "../ui/Money.svelte"

interface Props {
	card: AssetCardView
	currency: string
}

let { card, currency }: Props = $props()
const year = $derived(card.year)
</script>

<div class="mt-3 space-y-1 text-sm">
	{#if card.loan !== null && card.loan.known}
		<p>{card.loan.paidOff !== null ? `Its loan is paid off on ${card.loan.paidOff}.` : "Its loan is not paid off by the end of this Projection."}</p>
	{/if}
	{#if year !== null}
		<p class="text-muted-foreground">This year, {formatDate(year.from)} to {formatDate(year.to)}:</p>
		<ul class="list-inside list-disc">
			{#if year.running !== null}<li>Running costs <Money amount={year.running} {currency} /></li>{/if}
			{#if year.rent !== null}<li>Rent <Money amount={year.rent} {currency} /></li>{/if}
			{#if year.running === null && year.rent === null}<li>No running costs or rent fall in it.</li>{/if}
		</ul>
	{/if}
	{#each card.unfunded as span (span.from)}
		<p role="note" class="text-xs text-muted-foreground">The engine reports money not funded in {formatDate(span.from)} to {formatDate(span.to)}, when this asset is bought or sold: an obligation paid on a day a Contribution is due leaves it unfunded that month. See Cash flow.</p>
	{/each}
	{#if card.untaxed}
		<p class="text-xs text-muted-foreground">Rent and a sale are not taxed in this plan unless a Tally label is set, which this form does not set.</p>
	{/if}
	{#if card.outside.length > 0}
		<p role="note" class="text-xs text-destructive">This asset was changed outside the form: {card.outside.join(", ")} {card.outside.length === 1 ? "no longer matches" : "no longer match"} what the form writes, so {card.outside.length === 1 ? "it is" : "they are"} shown as {card.outside.length === 1 ? "an ordinary item" : "ordinary items"}. Change it in the terminal.</p>
	{/if}
</div>

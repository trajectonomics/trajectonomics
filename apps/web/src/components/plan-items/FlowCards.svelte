<script lang="ts">
import type { FlowCard } from "../../lib/view/plan-items/flows"
import Money from "../ui/Money.svelte"

interface Props {
	cards: readonly FlowCard[]
	currency: string
	editable: boolean
	onEdit: (id: string) => void
}

let { cards, currency, editable, onEdit }: Props = $props()
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each cards as card (card.id)}
		<li class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-start justify-between gap-3">
				<h2 class="font-semibold break-all">{card.id}</h2>
				{#if editable && card.editable}
					<button
						type="button"
						aria-label="Edit {card.id}"
						onclick={() => onEdit(card.id)}
						class="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
					>
						Edit
					</button>
				{/if}
			</div>
			<p class="mt-2 text-lg">
				{#if card.amount !== null}
					<Money amount={card.amount} {currency} />
				{:else}
					<span class="text-muted-foreground">computed</span>
				{/if}
			</p>
			<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">How often</dt>
				<dd>{card.frequency}</dd>
				<dt class="text-muted-foreground">Starts</dt>
				<dd>{card.start}{#if card.startAnchor !== null} <span class="block text-xs text-muted-foreground">{card.startAnchor}</span>{/if}</dd>
				<dt class="text-muted-foreground">Ends</dt>
				<dd>{card.end}{#if card.endAnchor !== null} <span class="block text-xs text-muted-foreground">{card.endAnchor}</span>{/if}</dd>
				<dt class="text-muted-foreground">Growth</dt>
				<dd>{card.growth}</dd>
				{#if card.earned !== null}
					<dt class="text-muted-foreground">Income</dt>
					<dd>{card.earned}</dd>
				{/if}
			</dl>
		</li>
	{/each}
</ul>

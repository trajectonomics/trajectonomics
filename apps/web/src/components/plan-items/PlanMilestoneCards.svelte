<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { withSearch } from "../../lib/view/links"
import type { MilestoneCardView } from "../../lib/view/plan-items/milestone-cards"
import ItemName from "../ui/ItemName.svelte"
import Money from "../ui/Money.svelte"

interface Props {
	/** The plan's Milestones, each with its date or the year it is not reached by. */
	cards: readonly MilestoneCardView[]
}

/** The Plan's compact cards of the plan's Milestones: each links to the Milestones page, on its own row. */
let { cards }: Props = $props()
const href = $derived(withSearch("/milestones/", currentSearch()))
</script>

<ul class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
	{#each cards as card (card.id)}
		<li class="min-w-0">
			<a
				href="{href}#{card.id}"
				class="block h-full w-full rounded-lg border border-border bg-card p-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>
				<span class="flex items-start justify-between gap-2">
					<span class="min-w-0 font-medium wrap-anywhere"><ItemName kind="milestone" id={card.id} /></span>
					<span class="shrink-0 text-xs text-muted-foreground">
						{#if card.date !== null}
							{card.date}
						{:else if card.notReachedBy !== null}
							Not reached by {card.notReachedBy}
						{/if}
					</span>
				</span>
				{#if card.terms.words !== ""}
					<span class="mt-1 block text-xs text-muted-foreground">{card.terms.words}{#if card.terms.amount !== null} <Money amount={card.terms.amount} compact />{/if}</span>
				{/if}
			</a>
		</li>
	{/each}
</ul>

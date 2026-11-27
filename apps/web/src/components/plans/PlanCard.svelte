<script lang="ts">
import { formatDate } from "../../lib/format"
import type { PlanCard } from "../../lib/view/plans/card"
import LineChart from "../chart/LineChart.svelte"
import ItemWords from "../ui/ItemWords.svelte"
import SiteLink from "../ui/SiteLink.svelte"
import PlanFacts from "./PlanFacts.svelte"
import PlanMenu from "./PlanMenu.svelte"
import PlanNotes from "./PlanNotes.svelte"
import PlanTags from "./PlanTags.svelte"

interface Props {
	card: PlanCard
	/** Whether the server answers Edits: then the card has the same menu as the plan switcher. */
	editable: boolean
}

let { card, editable }: Props = $props()
const name = $derived(card.row.name)
</script>

<!-- One plan on the plans page: its name and marks, its notes, its figures, and its net worth by year. -->
<article class="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
	<header class="flex flex-wrap items-center gap-2">
		<h2 class="min-w-0 text-base font-semibold break-words">{name}</h2>
		<PlanTags row={card.row} />
	</header>
	{#if card.notes}<PlanNotes notes={card.notes} />{/if}
	{#if card.problem}
		<p role="alert" class="text-sm text-destructive" data-cli>{card.problem}</p>
	{:else}
		<PlanFacts {card} />
		{#if card.series.length > 0}
			<LineChart label={`Net worth by year, ${name}`} series={card.series} markers={card.markers} />
			{#if card.milestones.length > 0}
				<!-- The chart shortens a rule's label to the room it has, or leaves it out, and a phone has no hover,
				so the card names each Milestone it draws in full. -->
				<ul aria-label="Milestones reached" class="space-y-1 text-xs text-muted-foreground">
					{#each card.milestones as milestone (milestone.label.id)}
						<li>
							<ItemWords label={milestone.label} />: reached on <time
								datetime={milestone.date}>{formatDate(milestone.date)}</time
							>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}
	<footer class="mt-auto flex flex-wrap items-center gap-3">
		<SiteLink
			href={`/projection/?scenario=${encodeURIComponent(name)}`}
			class="text-sm text-accent underline-offset-4 hover:underline"
		>
			Open the Plan for {name}
		</SiteLink>
		{#if editable}<PlanMenu row={card.row} />{/if}
	</footer>
</article>

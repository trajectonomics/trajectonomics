<script lang="ts">
import { notProjected, planCards } from "../../lib/view/plans/card"
import { parseRange, RANGES } from "../../lib/view/plans/range"
import FirstPlanLink from "../plans/FirstPlanLink.svelte"
import NotProjected from "../plans/NotProjected.svelte"
import PlanCard from "../plans/PlanCard.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import PageShell from "../ui/PageShell.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"

interface Props {
	/** The range the address bar asks for: "10", "20", "30" or "all". An unknown one reads as the whole plan. */
	range: string
	onRange: (id: string) => void
	/** Whether the Edit controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

/** Every plan side by side: one card each, the main plan first, over the range the control chooses. */
let { range, onRange, editable }: Props = $props()
const chosen = $derived(parseRange(range))
const options = RANGES.map((one) => ({ value: one.id, label: one.label }))
</script>

<PageShell
	title="Plans"
>
	{#snippet children(snapshot)}
		{@const cards = planCards(snapshot, chosen)}
		{@const firstPlan = snapshot.params.scenarios.length === 0}
		<div class="space-y-6">
			{#if firstPlan}
				<EmptyState title="No plan yet">
					<FirstPlanLink />
				</EmptyState>
			{:else}
				<SegmentedControl name="plan-range" label="Range" {options} value={chosen.id} onChange={onRange} />
				{#if cards.length === 0}
					<EmptyState title="No plan is projected in this dashboard" />
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{#each cards as card (card.row.name)}
							<PlanCard {card} {editable} />
						{/each}
					</div>
				{/if}
				<NotProjected rows={notProjected(snapshot)} {editable} />
			{/if}
		</div>
	{/snippet}
</PageShell>

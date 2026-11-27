<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import { milestoneCards } from "../../lib/view/plan-items/milestone-cards"
import { planTabs, tabOf } from "../../lib/view/plan-items/tabs"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import PlanItemsBody from "./PlanItemsBody.svelte"
import PlanMilestoneCards from "./PlanMilestoneCards.svelte"
import PlanTabStrip from "./PlanTabStrip.svelte"

interface Props {
	snapshot: Snapshot
	/** The Scenario the address bar asks for. */
	scenario: string
	editable: boolean
	/** The `items` query value the address bar names. */
	items: string
	/** Writes the selected tab to the address bar. */
	onItems: (value: string) => void
}

/** The Plan's items under its chart: Income, Expenses, Assets and debts and Milestones, as compact cards. */
let { snapshot, scenario, editable, items, onItems }: Props = $props()
const tab = $derived(tabOf(items))
const name = $derived(chooseScenario(snapshot.params.scenarios, scenario))
const docRead = $derived(name === null ? undefined : snapshot.reads.documents[name])
const doc = $derived(docRead?.ok === true ? docRead.data.scenario.document : null)
const projection = $derived(name === null ? undefined : snapshot.reads.projections[name])
const run = $derived(projection?.ok === true ? projection.data : undefined)
const cards = $derived(milestoneCards(doc, run))
const kind = $derived(tab === "expenses" ? "expense" : tab === "assets" ? "assets" : "income")
</script>

<div>
	<PlanTabStrip tabs={planTabs(doc)} selected={tab} onSelect={onItems} />
	<div role="tabpanel" id="plan-items-panel" aria-labelledby="plan-tab-{tab}" class="pt-4">
		{#if tab === "milestones"}
			{#if docRead === undefined}
				<EmptyState title="No plan document to show" />
			{:else if !docRead.ok}
				<ReadView read={docRead} label={`The plan of ${name}`}>
					{#snippet children()}{/snippet}
				</ReadView>
			{:else if cards.length === 0}
				<EmptyState title="No milestones in this plan" />
			{:else}
				<PlanMilestoneCards {cards} />
			{/if}
		{:else}
			<PlanItemsBody {snapshot} {kind} {scenario} {editable} density="compact" />
		{/if}
	</div>
</div>

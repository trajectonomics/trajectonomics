<script lang="ts">
import { formatDate, yearOf } from "../../lib/format"
import type { EstateSummary } from "../../lib/view/estate/home"
import type { CardFigure } from "../../lib/view/overview/card-details"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Money from "../ui/Money.svelte"
import CardDetails from "./CardDetails.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<EstateSummary | null>
}

let { scenario }: Props = $props()
// Shown when the plan states an estate: a Snapshot made without `--estate` has no card.
const shown = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data !== null,
)
const view = $derived(scenario.status === "ready" && scenario.read.ok ? scenario.read.data : null)
/** What heirs would receive at the exact figure, its date and the CLI's notes, in Details. */
const figures = $derived<CardFigure[]>(
	view === null
		? []
		: [
				{
					label: "Your heirs would receive",
					value: view.toHeirs,
					money: true,
					currency: view.currency,
				},
				{ label: "On", value: formatDate(view.date), money: false },
			],
)
</script>

{#if shown}
	<ScenarioCard title="Your heirs would receive" href="/estate/" label="estate" {scenario} level={3} className="col-span-2">
		{#snippet details()}
			<CardDetails {figures} notes={view?.notes ?? []} />
		{/snippet}
		{#snippet body(data: EstateSummary | null)}
			{#if data !== null}
				<div class="space-y-1">
					<p class="text-lg font-semibold tracking-tight"><Money amount={data.toHeirs} currency={data.currency} compact /></p>
					<p class="text-sm text-muted-foreground">
						{#if data.short}Debts and costs come to more than everything owned, so heirs would receive nothing.{:else if data.noCost}In {yearOf(data.date)}, after debts and gifts, with no settlement cost set.{:else}In {yearOf(data.date)}, after debts, costs and gifts.{/if}
					</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}
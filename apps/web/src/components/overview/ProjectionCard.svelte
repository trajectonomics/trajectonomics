<script lang="ts">
import type { CardFigure } from "../../lib/view/overview/card-details"
import type { ProjectionView } from "../../lib/view/overview/projection"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Money from "../ui/Money.svelte"
import CardDetails from "./CardDetails.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<ProjectionView | null>
}

/** The closing net worth, in future money and today's, with the CLI's exact strings in Details. */
let { scenario }: Props = $props()
/** The title names the plan's last year when the run states one. */
const view = $derived(scenario.status === "ready" && scenario.read.ok ? scenario.read.data : null)
const title = $derived(view === null ? "At the end" : `At the end, ${view.horizonYear}`)
const figures = $derived<CardFigure[]>(
	view === null
		? []
		: [
				{
					label: "Closing net worth",
					value: view.nominal,
					money: true,
					currency: view.currency,
				},
				{
					label: "In today's money",
					value: view.real,
					money: true,
					currency: view.currency,
				},
			],
)
</script>

<!-- The closing net worth in future money, and the same figure in today's money under it. -->
<ScenarioCard {title} href="/projection/" label="Projection" {scenario} level={3}>
	{#snippet details(shown: ScenarioView<ProjectionView | null>)}
		{@const data = shown.status === "ready" && shown.read.ok ? shown.read.data : null}
		<CardDetails {figures} notes={data?.notes ?? []} />
	{/snippet}
	{#snippet body(data: ProjectionView | null)}
		{#if data === null}
			<p class="text-sm">The projection has no annual rows.</p>
		{:else}
			<div class="space-y-1">
				<p class="text-lg font-semibold tracking-tight">
					<Money amount={data.nominal} currency={data.currency} compact />
				</p>
				<p class="text-sm text-muted-foreground">
					<Money amount={data.real} compact /> in today's money
				</p>
			</div>
		{/if}
	{/snippet}
</ScenarioCard>
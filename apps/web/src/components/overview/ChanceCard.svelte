<script lang="ts">
import type { ChanceSummary } from "../../lib/view/chance/page"
import type { CardFigure } from "../../lib/view/overview/card-details"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import CardDetails from "./CardDetails.svelte"
import ChanceRing from "./ChanceRing.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<ChanceSummary>
}

/** The success share for the primary Scenario, and the markets it holds on. */
let { scenario }: Props = $props()
const view = $derived(scenario.status === "ready" && scenario.read.ok ? scenario.read.data : null)
const figures = $derived<CardFigure[]>(
	view === null
		? []
		: [
				{ label: "Chance of success", value: view.share, money: false },
				{ label: "Markets that last", value: `${view.succeeded} of ${view.paths}`, money: false },
			],
)
/** "193 of 200 markets last": the CLI's two counts, in plain words. */
function marketsLast(data: ChanceSummary): string {
	const noun = data.paths === 1 ? "market lasts" : "markets last"
	return `${data.succeeded} of ${data.paths} ${noun}`
}
</script>

<ScenarioCard title="Chance of success" href="/chance/" label="chance" {scenario} level={3}>
	{#snippet details(shown: ScenarioView<ChanceSummary>)}
		{@const data = shown.status === "ready" && shown.read.ok ? shown.read.data : null}
		<CardDetails {figures} notes={data?.notes ?? []} />
	{/snippet}
	{#snippet body(data: ChanceSummary)}
		<div class="space-y-1">
			<div class="flex items-center justify-between gap-2">
				<p class="text-lg font-semibold tracking-tight tabular-nums">{data.share}</p>
				<ChanceRing share={data.share} />
			</div>
			<p class="text-sm text-muted-foreground">{marketsLast(data)}</p>
		</div>
	{/snippet}
</ScenarioCard>
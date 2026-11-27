<script lang="ts">
import type { ChanceSummary } from "../../lib/view/chance/page"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import ChanceRing from "./ChanceRing.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<ChanceSummary>
}

/** The success share for the primary Scenario, and the markets it holds on. */
let { scenario }: Props = $props()
/** "193 of 200 markets last": the CLI's two counts, in plain words. */
function marketsLast(view: ChanceSummary): string {
	const noun = view.paths === 1 ? "market lasts" : "markets last"
	return `${view.succeeded} of ${view.paths} ${noun}`
}
</script>

<ScenarioCard title="Chance of success" href="/chance/" label="chance" {scenario}>
	{#snippet body(view: ChanceSummary)}
		<div class="space-y-1">
			<div class="flex items-center justify-between gap-2">
				<p class="text-lg font-semibold tracking-tight tabular-nums">{view.share}</p>
				<ChanceRing share={view.share} />
			</div>
			<p class="text-sm text-muted-foreground">{marketsLast(view)}</p>
		</div>
	{/snippet}
</ScenarioCard>

<script lang="ts">
import type { ChanceSummary } from "../../lib/view/chance/page"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<ChanceSummary>
}

/** The success share for the primary Scenario, and the paths it holds on. */
let { scenario }: Props = $props()
</script>

<ScenarioCard title="Chance of success" href="/chance/" label="chance" {scenario}>
	{#snippet body(view: ChanceSummary)}
		<div class="space-y-2">
			<p class="text-3xl font-semibold tracking-tight tabular-nums">{view.share} <span class="text-base font-normal text-muted-foreground">chance</span></p>
			<p class="text-sm">{view.lasts}</p>
		</div>
	{/snippet}
</ScenarioCard>

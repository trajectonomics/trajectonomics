<script lang="ts">
import type { FiView } from "../../lib/view/overview/fi"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<FiView>
}

let { scenario }: Props = $props()
</script>

<!-- The FI date for the primary Scenario: its month when reachable, else the horizon and what binds. -->
<ScenarioCard title="FI date" href="/fi/" label="FI" {scenario}>
	{#snippet body(view: FiView)}
		{#if view.reachable}
			<p class="text-3xl font-semibold tracking-tight">{view.month}</p>
		{:else}
			<div class="space-y-2">
				<p class="text-xl font-semibold tracking-tight">Not reachable before {view.horizon}</p>
				<p class="text-sm">{view.binding}</p>
			</div>
		{/if}
	{/snippet}
</ScenarioCard>

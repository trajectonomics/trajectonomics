<script lang="ts">
import type { ProjectionView } from "../../lib/view/overview/projection"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<ProjectionView | null>
}

let { scenario }: Props = $props()
/** The title names the plan's last year when the run states one. */
const title = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data !== null
		? `At the end, ${scenario.read.data.horizonYear}`
		: "At the end",
)
</script>

<!-- The closing net worth in future money, and the same figure in today's money under it. -->
<ScenarioCard {title} href="/projection/" label="Projection" {scenario}>
	{#snippet body(view: ProjectionView | null)}
		{#if view === null}
			<p class="text-sm">The projection has no annual rows.</p>
		{:else}
			<div class="space-y-1">
				<p class="text-lg font-semibold tracking-tight">
					<Money amount={view.nominal} currency={view.currency} compact />
				</p>
				<p class="text-sm text-muted-foreground">
					<Money amount={view.real} compact /> in today's money
				</p>
			</div>
		{/if}
	{/snippet}
</ScenarioCard>

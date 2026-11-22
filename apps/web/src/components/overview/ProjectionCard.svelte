<script lang="ts">
import type { ProjectionView } from "../../lib/view/overview/projection"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<ProjectionView | null>
}

let { scenario }: Props = $props()
</script>

<!-- The projection's closing net worth, nominal and in As-of terms, and whether it runs out. -->
<ScenarioCard title="Projection" href="/projection/" label="Projection" {scenario}>
	{#snippet body(view: ProjectionView | null)}
		{#if view === null}
			<p class="text-sm">The projection has no annual rows.</p>
		{:else}
			<div class="space-y-4">
				<div class="flex flex-wrap gap-x-6 gap-y-3">
					<div>
						<p class="text-sm text-muted-foreground">Net worth at {view.endDate}</p>
						<p class="mt-1 text-2xl font-semibold tracking-tight">
							<Money amount={view.nominal} currency={view.currency} />
						</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Real, in As-of terms</p>
						<p class="mt-1 text-2xl font-semibold tracking-tight">
							<Money amount={view.real} currency={view.currency} />
						</p>
					</div>
				</div>
				{#if view.runsOut === null}
					<p class="text-sm">Does not run out before {view.horizon}.</p>
				{:else}
					<p class="text-sm">
						Runs out on {view.runsOut.date}, with
						<Money amount={view.runsOut.unmet} currency={view.currency} /> unmet.
					</p>
				{/if}
			</div>
		{/if}
	{/snippet}
</ScenarioCard>

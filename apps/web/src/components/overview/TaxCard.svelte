<script lang="ts">
import type { ScenarioView } from "../../lib/view/overview/scenario"
import type { TaxView } from "../../lib/view/overview/tax"
import Badge from "../ui/Badge.svelte"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<TaxView>
}

let { scenario }: Props = $props()
</script>

<!-- The first settlement period of the primary Scenario: what is owed, when it is due, and the tax status. -->
<ScenarioCard title="Tax" href="/tax/" label="tax" {scenario}>
	{#snippet body(view: TaxView)}
		<div class="space-y-4">
			<Badge>{view.status}</Badge>
			{#if view.first === null}
				<p class="text-sm">This Scenario has no Levy, so every figure is before tax.</p>
			{:else}
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">
						{view.first.owed.startsWith("-") ? "Refund for" : "Owed for"}
						{view.first.period}
					</p>
					<p class="text-2xl font-semibold tracking-tight">
						<Money amount={view.first.owed} currency={view.currency} />
					</p>
					<p class="text-sm">Settles {view.first.settlement}</p>
					<p class="text-sm text-muted-foreground">Levy {view.first.levy}</p>
					{#if view.first.partial}
						<p class="text-sm">A partial year.</p>
					{/if}
					{#if !view.first.settled}
						<p class="text-sm">Its settlement is not in view.</p>
					{/if}
				</div>
			{/if}
		</div>
	{/snippet}
</ScenarioCard>

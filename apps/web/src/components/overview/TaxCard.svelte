<script lang="ts">
import type { ScenarioView } from "../../lib/view/overview/scenario"
import type { TaxView } from "../../lib/view/overview/tax"
import Fact from "../projection/Fact.svelte"
import Badge from "../ui/Badge.svelte"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<TaxView>
}

let { scenario }: Props = $props()

/** The id of the tax rules the first period was charged by, in the card's Details. */
function taxRules(view: ScenarioView<TaxView>): string | null {
	if (view.status !== "ready" || !view.read.ok || view.read.data.first === null) return null
	return view.read.data.first.levy
}
</script>

<!-- The first settlement period of the primary Scenario: what is owed, when it is due, and the tax status. -->
<ScenarioCard title="Tax" href="/tax/" label="tax" {scenario}>
	{#snippet details(view: ScenarioView<TaxView>)}
		{@const rules = taxRules(view)}
		{#if rules !== null}
			<dl class="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<Fact label="Tax rules"><code class="font-mono">{rules}</code></Fact>
			</dl>
		{/if}
	{/snippet}
	{#snippet body(view: TaxView)}
		<div class="space-y-4">
			<Badge>{view.status}</Badge>
			{#if view.first === null}
				<p class="text-sm">This plan has no tax rules, so every figure is before tax.</p>
			{:else}
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">{view.first.owed.startsWith("-") ? "Refund for" : "Tax for"} {view.first.period}</p>
					<p class="text-2xl font-semibold tracking-tight">
						<Money amount={view.first.owed} currency={view.currency} compact />
					</p>
					<p class="text-sm">Due {view.first.settlement}</p>
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

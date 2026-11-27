<script lang="ts">
import type { ScenarioView } from "../../lib/view/overview/scenario"
import type { TaxView } from "../../lib/view/overview/tax"
import Fact from "../projection/Fact.svelte"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<TaxView>
}

let { scenario }: Props = $props()
/** The title names the period the CLI states, such as "Tax for 2026". */
const title = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data.first !== null
		? `Tax for ${scenario.read.data.first.period}`
		: "Tax",
)
/** The id of the tax rules the first period was charged by, in the card's Details. */
function taxRules(view: ScenarioView<TaxView>): string | null {
	if (view.status !== "ready" || !view.read.ok || view.read.data.first === null) return null
	return view.read.data.first.levy
}
</script>

<!-- The first settlement period of the plan: what is owed and when it is due, with the levy id in Details. -->
<ScenarioCard {title} href="/tax/" label="tax" {scenario}>
	{#snippet details(view: ScenarioView<TaxView>)}
		{@const rules = taxRules(view)}
		{#if rules !== null}
			<dl class="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<Fact label="Tax rules"><code class="font-mono">{rules}</code></Fact>
			</dl>
		{/if}
	{/snippet}
	{#snippet body(view: TaxView)}
		{#if view.first === null}
			<p class="text-sm">This plan has no tax rules, so every figure is before tax.</p>
		{:else}
			<div class="space-y-1">
				<p class="text-lg font-semibold tracking-tight">
					<Money amount={view.first.owed} currency={view.currency} compact signed />
				</p>
				<p class="text-sm text-muted-foreground">Due {view.first.settlement}</p>
				{#if view.first.partial}
					<p class="text-sm text-muted-foreground">A partial year.</p>
				{/if}
				{#if !view.first.settled}
					<p class="text-sm text-muted-foreground">Its settlement is not in view.</p>
				{/if}
			</div>
		{/if}
	{/snippet}
</ScenarioCard>

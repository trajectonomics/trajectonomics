<script lang="ts">
import type { CardFigure } from "../../lib/view/overview/card-details"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import type { TaxView } from "../../lib/view/overview/tax"
import { isRefund } from "../../lib/view/tax/tax-rows"
import Fact from "../projection/Fact.svelte"
import Money from "../ui/Money.svelte"
import CardDetails from "./CardDetails.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<TaxView>
}

let { scenario }: Props = $props()
const view = $derived(scenario.status === "ready" && scenario.read.ok ? scenario.read.data : null)
const first = $derived(view?.first ?? null)
/** The title names the period, and says a refund in words, as the Tax page's headline does. */
const title = $derived(
	first === null ? "Tax" : `${isRefund(first.owed) ? "Refund" : "Tax"} for ${first.period}`,
)
/** The exact figure the CLI states, in Details; a refund keeps its sign in the string. */
const figures = $derived<CardFigure[]>(
	first === null || view === null
		? []
		: [
				{
					label: isRefund(first.owed) ? "Refund" : "Tax owed",
					value: first.owed,
					money: true,
					currency: view.currency,
				},
			],
)
/** The id of the tax rules the first period was charged by, in the card's Details. */
function taxRules(shown: ScenarioView<TaxView>): string | null {
	if (shown.status !== "ready" || !shown.read.ok || shown.read.data.first === null) return null
	return shown.read.data.first.levy
}
</script>

<!-- The first settlement period of the plan: what is owed or refunded and when, with the levy id in Details. -->
<ScenarioCard {title} href="/tax/" label="tax" {scenario} level={3}>
	{#snippet details(shown: ScenarioView<TaxView>)}
		{@const rules = taxRules(shown)}
		<CardDetails {figures} notes={view?.notes ?? []} />
		{#if rules !== null}
			<dl class="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<Fact label="Tax rules"><code class="font-mono">{rules}</code></Fact>
			</dl>
		{/if}
	{/snippet}
	{#snippet body(data: TaxView)}
		{#if data.first === null}
			<p class="text-sm">This plan has no tax rules, so every figure is before tax.</p>
		{:else}
			<div class="space-y-1">
				<p class="text-lg font-semibold tracking-tight">
					<Money amount={data.first.owed} currency={data.currency} compact />
				</p>
				<p class="text-sm text-muted-foreground">Due {data.first.settlement}</p>
				{#if data.first.partial}
					<p class="text-sm text-muted-foreground">A partial year.</p>
				{/if}
				{#if !data.first.settled}
					<p class="text-sm text-muted-foreground">Its settlement is not in view.</p>
				{/if}
			</div>
		{/if}
	{/snippet}
</ScenarioCard>
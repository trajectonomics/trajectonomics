<script lang="ts">
import type { ScenarioView } from "../../lib/view/overview/scenario"
import type { WithdrawalsSummary } from "../../lib/view/withdrawals/home"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<WithdrawalsSummary | null>
}

let { scenario }: Props = $props()
// Shown only when the plan has a spending rule that pays in its horizon: a plan with none has no card.
const shown = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data !== null,
)
</script>

{#if shown}
	<ScenarioCard title="You could spend" href="/optimize/withdrawals/" label="withdrawals" {scenario}>
		{#snippet body(view: WithdrawalsSummary | null)}
			{#if view !== null}
				<div class="space-y-2">
					<p class="text-2xl font-semibold tracking-tight"><Money amount={view.amount} currency={view.currency} /></p>
					<p class="text-sm text-muted-foreground">In the first year, from {view.from}{#if view.share !== null}, {view.share} of your savings{/if}.</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}

<script lang="ts">
import type { CardFigure } from "../../lib/view/overview/card-details"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import type { WithdrawalsSummary } from "../../lib/view/withdrawals/home"
import Money from "../ui/Money.svelte"
import CardDetails from "./CardDetails.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<WithdrawalsSummary | null>
}

let { scenario }: Props = $props()
// Shown only when the plan has a spending rule that pays in its horizon: a plan with none has no card.
const shown = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data !== null,
)
const view = $derived(scenario.status === "ready" && scenario.read.ok ? scenario.read.data : null)
/** The first Rule year's exact amount, its share and its month, with the CLI's notes, in Details. */
const figures = $derived<CardFigure[]>(
	view === null
		? []
		: [
				{
					label: "Spending a year",
					value: view.amount,
					money: true,
					currency: view.currency,
				},
				...(view.share === null ? [] : [{ label: "Of savings", value: view.share, money: false }]),
				{ label: "From", value: view.month, money: false },
			],
)
</script>

{#if shown}
	<ScenarioCard title="Spending in retirement" href="/optimize/withdrawals/" label="withdrawals" {scenario} level={3}>
		{#snippet details()}
			<CardDetails {figures} notes={view?.notes ?? []} />
		{/snippet}
		{#snippet body(data: WithdrawalsSummary | null)}
			{#if data !== null}
				<div class="space-y-1">
					<p class="text-lg font-semibold tracking-tight"><Money amount={data.amount} currency={data.currency} compact /><span class="text-sm font-normal text-muted-foreground">/yr</span></p>
					<p class="text-sm text-muted-foreground">From {data.month}{#if data.share !== null}, {data.share} of savings{/if}.</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}
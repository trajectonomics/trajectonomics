<script lang="ts">
import type { AllowancesSaving, AllowancesSummary } from "../../lib/view/allowances/home"
import type { CardFigure } from "../../lib/view/overview/card-details"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import ItemWords from "../ui/ItemWords.svelte"
import Money from "../ui/Money.svelte"
import CardDetails from "./CardDetails.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<AllowancesSummary | null>
}

/** A Return's saving as the CLI states it, and its exact string in Details. */
let { scenario }: Props = $props()
// Shown only when there is a saving to state: a plan with no allowance read, or one whose year saves nothing more, has no card.
const shown = $derived(
	scenario.status === "ready" && (!scenario.read.ok || scenario.read.data !== null),
)
const view = $derived(scenario.status === "ready" && scenario.read.ok ? scenario.read.data : null)
// One Return keeps the card's single figure, as it always showed it; several Returns name each one.
const single = $derived(view?.savings.length === 1 ? view.savings[0] : undefined)
/** The words a Return's exact figure carries in Details. */
function labelOf(saving: AllowancesSaving): string {
	if (saving.name === null) return "Saving"
	return typeof saving.name === "string" ? saving.name : saving.name.text
}
const figures = $derived<CardFigure[]>(
	view === null
		? []
		: view.savings.map((one) => ({
				label: labelOf(one),
				value: one.saving,
				money: true,
				currency: view.currency,
				key: one.key,
			})),
)
</script>

{#if shown}
	<ScenarioCard title="Tax you could save" href="/optimize/allowances/" label="tax allowances" {scenario} level={3}>
		{#snippet details()}
			<CardDetails {figures} notes={view?.notes ?? []} />
		{/snippet}
		{#snippet body(data: AllowancesSummary | null)}
			{#if data !== null}
				<div class="space-y-1">
					{#if single !== undefined && single.name === null}
						<p class="text-lg font-semibold tracking-tight"><Money amount={single.saving} currency={data.currency} compact /></p>
					{:else}
						<dl class="space-y-1">
							{#each data.savings as one (one.key)}
								<div class="flex items-baseline justify-between gap-3">
									<dt class="text-sm text-muted-foreground">{#if typeof one.name === "string"}{one.name}{:else if one.name !== null}<ItemWords label={one.name} />{/if}</dt>
									<dd class="text-lg font-semibold tracking-tight"><Money amount={one.saving} currency={data.currency} compact /></dd>
								</div>
							{/each}
						</dl>
					{/if}
					<p class="text-sm text-muted-foreground">With more allowances this year.</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}
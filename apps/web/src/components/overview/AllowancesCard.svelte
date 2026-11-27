<script lang="ts">
import type { AllowancesSummary } from "../../lib/view/allowances/home"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import ItemWords from "../ui/ItemWords.svelte"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<AllowancesSummary | null>
}

let { scenario }: Props = $props()
// Shown only when there is a saving to state: a plan with no allowance read, or one whose year saves nothing more, has no card.
const shown = $derived(
	scenario.status === "ready" && (!scenario.read.ok || scenario.read.data !== null),
)
// One Return keeps the card's single figure, as it always showed it; several Returns name each one.
const single = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data?.savings.length === 1
		? scenario.read.data.savings[0]
		: undefined,
)
</script>

{#if shown}
	<ScenarioCard title="Tax you could still save this year" href="/optimize/allowances/" label="tax allowances" {scenario}>
		{#snippet body(view: AllowancesSummary | null)}
			{#if view !== null}
				<div class="space-y-2">
					{#if single !== undefined && single.name === null}
						<p class="text-2xl font-semibold tracking-tight"><Money amount={single.saving} currency={view.currency} compact /></p>
					{:else}
						<dl class="space-y-1">
							{#each view.savings as one (one.key)}
								<div class="flex items-baseline justify-between gap-3">
									<dt class="text-sm text-muted-foreground">{#if typeof one.name === "string"}{one.name}{:else if one.name !== null}<ItemWords label={one.name} />{/if}</dt>
									<dd class="text-xl font-semibold tracking-tight"><Money amount={one.saving} currency={view.currency} compact /></dd>
								</div>
							{/each}
						</dl>
					{/if}
					<p class="text-sm text-muted-foreground">By taking more of your allowances in {view.period}.</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}

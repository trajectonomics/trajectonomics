<script lang="ts">
import type { AllowancesSummary } from "../../lib/view/allowances/home"
import type { ScenarioView } from "../../lib/view/overview/scenario"
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
</script>

{#if shown}
	<ScenarioCard title="Tax you could still save this year" href="/optimize/allowances/" label="tax allowances" {scenario}>
		{#snippet body(view: AllowancesSummary | null)}
			{#if view !== null}
				<div class="space-y-2">
					<p class="text-2xl font-semibold tracking-tight"><Money amount={view.saving} currency={view.currency} /></p>
					<p class="text-sm text-muted-foreground">By taking more of your allowances in {view.period}.</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}

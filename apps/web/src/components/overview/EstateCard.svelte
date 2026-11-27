<script lang="ts">
import { yearOf } from "../../lib/format"
import type { EstateSummary } from "../../lib/view/estate/home"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<EstateSummary | null>
}

let { scenario }: Props = $props()
// Shown when the plan states an estate: a Snapshot made without `--estate` has no card.
const shown = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data !== null,
)
</script>

{#if shown}
	<ScenarioCard title="Your heirs would receive" href="/estate/" label="estate" {scenario} className="col-span-2">
		{#snippet body(view: EstateSummary | null)}
			{#if view !== null}
				<div class="space-y-1">
					<p class="text-lg font-semibold tracking-tight"><Money amount={view.toHeirs} currency={view.currency} compact /></p>
					<p class="text-sm text-muted-foreground">
						{#if view.short}Debts and costs come to more than everything owned, so heirs would receive nothing.{:else if view.noCost}In {yearOf(view.date)}, after debts and gifts, with no settlement cost set.{:else}In {yearOf(view.date)}, after debts, costs and gifts.{/if}
					</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}

<script lang="ts">
import { formatDate } from "../../lib/format"
import type { EstateSummary } from "../../lib/view/estate/home"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Money from "../ui/Money.svelte"
import ScenarioCard from "./ScenarioCard.svelte"

interface Props {
	scenario: ScenarioView<EstateSummary | null>
}

let { scenario }: Props = $props()
const WHEN = {
	life: ", the later life expectancy you set",
	beyond: ", the plan's last year, which falls before the life expectancy you set",
	"no-adult": ", the plan's last year, because the household names no adult",
	end: ", the plan's last year",
}
// Shown when the plan states an estate: a Snapshot made without `--estate` has no card.
const shown = $derived(
	scenario.status === "ready" && scenario.read.ok && scenario.read.data !== null,
)
</script>

{#if shown}
	<ScenarioCard title="Your heirs would receive" href="/estate/" label="estate" {scenario}>
		{#snippet body(view: EstateSummary | null)}
			{#if view !== null}
				<div class="space-y-2">
					<p class="text-2xl font-semibold tracking-tight"><Money amount={view.toHeirs} currency={view.currency} /></p>
					<p class="text-sm text-muted-foreground">
						On {formatDate(view.date)}{WHEN[view.basis]}.
						{#if view.short}Debts and costs come to more than everything owned, so heirs would receive nothing.{:else if view.noCost}No settlement cost is set, so this is everything owned less debts.{:else}After debts, settlement costs and gifts you set.{/if}
					</p>
				</div>
			{/if}
		{/snippet}
	</ScenarioCard>
{/if}

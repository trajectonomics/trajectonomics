<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { healthWarning } from "../../lib/view/health/warning"
import { householdOf, personNames } from "../../lib/view/item-names"
import { focusOf } from "../../lib/view/overview/focus"
import { homePlan } from "../../lib/view/overview/scenario"
import { overviewView } from "../../lib/view/overview/view"
import { baselineChance, baselineRun } from "../../lib/view/what-if/baseline"
import OverviewFocus from "../overview/OverviewFocus.svelte"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import PageShell from "../ui/PageShell.svelte"
import OverviewWhatIf from "../what-if/OverviewWhatIf.svelte"
import WhatIfAbove from "../what-if/WhatIfAbove.svelte"

interface Props {
	/** The Scenario the address bar names; left empty, Home follows the main plan. */
	scenario?: string
}

let { scenario = "" }: Props = $props()
</script>

<!-- The Overview: one focus point with the answer written on its chart, then the quiet summary cards. -->
<PageShell title="Overview">
	{#snippet children(snapshot)}
		{@const plan = homePlan(snapshot, scenario)}
		{@const projection = plan === null ? undefined : snapshot.reads.projections[plan]}
		{@const run = projection?.ok === true ? projection.data : null}
		{@const focus = focusOf(snapshot, scenario)}
		{@const people = personNames(householdOf(snapshot, plan))}
		{@const warning = healthWarning(snapshot)}
		{@const lens = plan === null ? null : whatIfSession.lensFor(plan)}
		<WhatIfAbove open={lens !== null} gap="space-y-4">
			{#snippet whatIf()}
				{#if lens && plan !== null}
					<OverviewWhatIf
						{lens}
						baseline={baselineRun(snapshot, plan)}
						baselineChance={baselineChance(snapshot, plan)}
					/>
				{/if}
			{/snippet}
			<div class="space-y-6">
				<OverviewFocus {focus} {run} {people} {warning} />
				<OverviewGrid view={overviewView(snapshot, scenario)} />
			</div>
		</WhatIfAbove>
	{/snippet}
</PageShell>

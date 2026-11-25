<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { heroOf } from "../../lib/view/overview/hero"
import { homePlan } from "../../lib/view/overview/scenario"
import { overviewView } from "../../lib/view/overview/view"
import { baselineChance, baselineRun } from "../../lib/view/what-if/baseline"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import OverviewHero from "../overview/OverviewHero.svelte"
import PageShell from "../ui/PageShell.svelte"
import OverviewWhatIf from "../what-if/OverviewWhatIf.svelte"
import WhatIfAbove from "../what-if/WhatIfAbove.svelte"

interface Props {
	/** The Scenario the address bar names; left empty, Home follows the main plan. */
	scenario?: string
}

let { scenario = "" }: Props = $props()
</script>

<!-- The Overview: the headline figures, each card linking to its page and naming its command. -->
<PageShell
	title="Overview"
	intro="The headline figures of your ledger. Each card names the command that produced it."
>
	{#snippet children(snapshot)}
		{@const plan = homePlan(snapshot, scenario)}
		{@const hero = heroOf(snapshot, scenario)}
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
			<div class="space-y-4">
				{#if hero !== null}<OverviewHero {hero} />{/if}
				<OverviewGrid view={overviewView(snapshot, scenario)} />
			</div>
		</WhatIfAbove>
	{/snippet}
</PageShell>

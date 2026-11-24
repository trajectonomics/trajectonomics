<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { homePlan } from "../../lib/view/overview/scenario"
import { overviewView } from "../../lib/view/overview/view"
import { baselineChance, baselineRun } from "../../lib/view/what-if/baseline"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import PageShell from "../ui/PageShell.svelte"
import OverviewWhatIf from "../what-if/OverviewWhatIf.svelte"

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
		{@const lens = plan === null ? null : whatIfSession.lensFor(plan)}
		<div class="space-y-4">
			{#if lens && plan !== null}
				<OverviewWhatIf
					{lens}
					baseline={baselineRun(snapshot, plan)}
					baselineChance={baselineChance(snapshot, plan)}
				/>
			{/if}
			<OverviewGrid view={overviewView(snapshot, scenario)} />
		</div>
	{/snippet}
</PageShell>

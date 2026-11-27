<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { netWorthPageView } from "../../lib/view/net-worth/page"
import { chooseScenario } from "../../lib/view/plan"
import { baselineRun } from "../../lib/view/what-if/baseline"
import NetWorthContent from "../net-worth/NetWorthContent.svelte"
import RecordValues from "../record-values/RecordValues.svelte"
import PageShell from "../ui/PageShell.svelte"
import ProjectionWhatIf from "../what-if/ProjectionWhatIf.svelte"
import WhatIfAbove from "../what-if/WhatIfAbove.svelte"

interface Props {
	/** The Scenario the plan switcher selects: a what-if shows here only when it is on this plan. */
	scenario: string
}

let { scenario }: Props = $props()
</script>

<!-- Net worth: the headline, the month-end history, the composition by account and every row. -->
<PageShell
	title="Net worth"
>
	{#snippet children(snapshot)}
		{@const plan = chooseScenario(snapshot.params.scenarios, scenario)}
		{@const lens = plan === null ? null : whatIfSession.lensFor(plan)}
		<WhatIfAbove open={lens !== null}>
			{#snippet whatIf()}
				{#if lens && plan !== null}
					<ProjectionWhatIf {lens} baseline={baselineRun(snapshot, plan)} terms="nominal" keys={["closingNetWorth"]} />
				{/if}
			{/snippet}
			<div class="space-y-8">
				<RecordValues {snapshot} />
				<NetWorthContent view={netWorthPageView(snapshot)} />
			</div>
		</WhatIfAbove>
	{/snippet}
</PageShell>

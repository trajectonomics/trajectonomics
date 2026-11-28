<script lang="ts">
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { householdOf, personNames } from "../../lib/view/item-names"
import { focusOf } from "../../lib/view/overview/focus"
import { heroOf } from "../../lib/view/overview/hero"
import { homePlan } from "../../lib/view/overview/scenario"
import { overviewView } from "../../lib/view/overview/view"
import { baselineChance, baselineRun } from "../../lib/view/what-if/baseline"
import OverviewFocus from "../overview/OverviewFocus.svelte"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import TaxLabelNotice from "../plan-items/TaxLabelNotice.svelte"
import FirstPlanLink from "../plans/FirstPlanLink.svelte"
import EmptyState from "../ui/EmptyState.svelte"
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
		{#if plan === null}
			<EmptyState title="No plan yet">
				<FirstPlanLink />
			</EmptyState>
		{:else}
			{@const planDoc = snapshot.reads.documents[plan]}
			{@const projection = snapshot.reads.projections[plan]}
			{@const run = projection?.ok === true ? projection.data : null}
			{@const focus = focusOf(snapshot, scenario)}
			{@const hero = heroOf(snapshot, scenario)}
			{@const people = personNames(householdOf(snapshot, plan))}
			{@const lens = whatIfSession.lensFor(plan)}
			{#if taxLabelNotice.held !== null && planDoc?.ok === true}
				<TaxLabelNotice plan={plan} doc={planDoc.data.scenario.document} next />
			{/if}
			<WhatIfAbove open={lens !== null} gap="space-y-4">
				{#snippet whatIf()}
					{#if lens}
						<OverviewWhatIf
							{lens}
							baseline={baselineRun(snapshot, plan)}
							baselineChance={baselineChance(snapshot, plan)}
						/>
					{/if}
				{/snippet}
				<div class="space-y-6">
					<OverviewFocus
						{focus}
						{run}
						{people}
						warnings={hero?.warnings ?? []}
						warningsLabel={hero?.warningsLabel ?? null}
					/>
					<OverviewGrid view={overviewView(snapshot, scenario)} />
				</div>
			</WhatIfAbove>
		{/if}
	{/snippet}
</PageShell>
